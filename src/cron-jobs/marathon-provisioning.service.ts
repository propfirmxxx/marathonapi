import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import {
  MetaTraderAccount,
  MetaTraderAccountStatus,
} from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoService } from '../tokyo/tokyo.service';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonStatus } from '../marathon/enums/marathon-status.enum';
import { calculateMarathonLifecycleStatus } from '../marathon/utils/marathon-status.util';

@Injectable()
export class MarathonProvisioningService {
  private readonly logger = new Logger(MarathonProvisioningService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(MetaTraderAccount)
    private readonly accountRepository: Repository<MetaTraderAccount>,
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    private readonly tokyoService: TokyoService,
  ) {}

  async provisionStartedMarathons(): Promise<void> {
    const now = new Date();

    const participantsNeedingAccount = await this.participantRepository
      .createQueryBuilder('participant')
      .innerJoinAndSelect('participant.marathon', 'marathon')
      .leftJoinAndSelect('participant.user', 'user')
      .where('participant.metaTraderAccountId IS NULL')
      .andWhere('participant.isActive = :participantActive', { participantActive: true })
      .andWhere('marathon.isActive = :marathonActive', { marathonActive: true })
      .andWhere('marathon.startDate <= :now', { now })
      .andWhere('marathon.status = :marathonStatus', { marathonStatus: MarathonStatus.ONGOING })
      .orderBy('participant.createdAt', 'ASC')
      .getMany();

    for (const participant of participantsNeedingAccount) {
      const account = await this.assignAvailableAccount(participant.id, participant.user?.id ?? null);
      if (!account) {
        this.logger.warn(
          `No available MetaTrader accounts to assign for participant ${participant.id}; remaining participants will be retried on next run`,
        );
        break;
      }

      await this.deployAccountIfNeeded(account);
    }

    const participantsPendingDeployment = await this.participantRepository
      .createQueryBuilder('participant')
      .innerJoinAndSelect('participant.marathon', 'marathon')
      .innerJoinAndSelect('participant.metaTraderAccount', 'account')
      .where('participant.isActive = :participantActive', { participantActive: true })
      .andWhere('marathon.isActive = :marathonActive', { marathonActive: true })
      .andWhere('marathon.startDate <= :now', { now })
      .andWhere('marathon.status = :marathonStatus', { marathonStatus: MarathonStatus.ONGOING })
      .andWhere('account.status = :status', { status: MetaTraderAccountStatus.UNDEPLOYED })
      .getMany();

    for (const participant of participantsPendingDeployment) {
      await this.deployAccountIfNeeded(participant.metaTraderAccount);
    }
  }

  async synchronizeMarathonStatuses(): Promise<void> {
    const now = new Date();
    const candidates = await this.marathonRepository.find({
      where: {
        status: In([MarathonStatus.UPCOMING, MarathonStatus.ONGOING]),
      },
    });

    const updates: Marathon[] = [];

    for (const marathon of candidates) {
      const nextStatus = calculateMarathonLifecycleStatus(marathon.startDate, marathon.endDate, now);

      if (!marathon.isActive && nextStatus !== MarathonStatus.FINISHED) {
        continue;
      }

      if (
        nextStatus === MarathonStatus.ONGOING &&
        marathon.status === MarathonStatus.UPCOMING
      ) {
        marathon.status = MarathonStatus.ONGOING;
        updates.push(marathon);
        continue;
      }

      if (
        nextStatus === MarathonStatus.FINISHED &&
        marathon.status !== MarathonStatus.FINISHED
      ) {
        marathon.status = MarathonStatus.FINISHED;
        updates.push(marathon);
      }
    }

    if (updates.length > 0) {
      await this.marathonRepository.save(updates);
      updates.forEach((marathon) =>
        this.logger.log(`Updated marathon ${marathon.id} status to ${marathon.status}`),
      );
    }
  }

  private async assignAvailableAccount(
    participantId: string,
    userId: string | null,
  ): Promise<MetaTraderAccount | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager
        .getRepository(MetaTraderAccount)
        .createQueryBuilder('account')
        .setLock('pessimistic_write')
        .where('account.marathonParticipantId IS NULL')
        .orderBy('account.createdAt', 'ASC')
        .getOne();

      if (!account) {
        await queryRunner.rollbackTransaction();
        return null;
      }

      const participant = await queryRunner.manager.findOneOrFail(MarathonParticipant, {
        where: { id: participantId },
        lock: { mode: 'pessimistic_write' },
      });

      account.marathonParticipantId = participantId;
      account.userId = userId;
      participant.metaTraderAccountId = account.id;

      await queryRunner.manager.save(MetaTraderAccount, account);
      await queryRunner.manager.save(MarathonParticipant, participant);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Assigned MetaTrader account ${account.id} (login ${account.login}) to marathon participant ${participantId}`,
      );

      return await this.accountRepository.findOneOrFail({
        where: { id: account.id },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to assign MetaTrader account to participant ${participantId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async deployAccountIfNeeded(account: MetaTraderAccount): Promise<void> {
    if (!account.login) {
      this.logger.warn(`MetaTrader account ${account.id} has no login; skipping deployment`);
      return;
    }

    // Check if account is already deployed - reload from DB to ensure we have latest status
    const freshAccount = await this.accountRepository.findOne({
      where: { id: account.id },
    });

    if (!freshAccount) {
      this.logger.warn(`MetaTrader account ${account.id} not found in database; skipping deployment`);
      return;
    }

    if (freshAccount.status === MetaTraderAccountStatus.DEPLOYED) {
      this.logger.debug(`MetaTrader account ${account.login} is already deployed; skipping`);
      return;
    }

    try {
      await this.tokyoService.deployAccountWithAutoCreate(freshAccount);
      // Update status atomically
      await this.accountRepository.update(
        { id: freshAccount.id },
        { status: MetaTraderAccountStatus.DEPLOYED },
      );
      this.logger.log(`Deployed MetaTrader account ${freshAccount.login} for participant ${freshAccount.marathonParticipantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
      this.logger.error(
        `Failed to deploy MetaTrader account ${freshAccount.login}: ${message}`,
      );
      // Don't update status on failure - will retry on next cron run
    }
  }
}

