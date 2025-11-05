import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MetaTraderAccount, MetaTraderAccountStatus } from './entities/meta-trader-account.entity';
import { CreateMetaTraderAccountDto } from './dto/create-metatrader-account.dto';
import { AssignAccountDto } from './dto/assign-account.dto';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';

@Injectable()
export class MetaTraderAccountService {
  private readonly logger = new Logger(MetaTraderAccountService.name);

  constructor(
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateMetaTraderAccountDto): Promise<MetaTraderAccount> {
    // Validate that at least one password is provided
    if (!createDto.masterPassword && !createDto.investorPassword) {
      throw new BadRequestException('Either masterPassword or investorPassword must be provided');
    }

    const account = this.metaTraderAccountRepository.create({
      name: createDto.name,
      login: createDto.login,
      masterPassword: createDto.masterPassword,
      investorPassword: createDto.investorPassword,
      server: createDto.server,
      platform: createDto.platform || 'mt5',
      status: createDto.status || MetaTraderAccountStatus.UNDEPLOYED,
    });

    return await this.metaTraderAccountRepository.save(account);
  }

  async findById(id: string): Promise<MetaTraderAccount> {
    const account = await this.metaTraderAccountRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!account) {
      throw new NotFoundException(`MetaTrader account with ID ${id} not found`);
    }

    return account;
  }

  async findAvailable(): Promise<MetaTraderAccount[]> {
    return await this.metaTraderAccountRepository.find({
      where: { marathonParticipantId: null },
      relations: ['user'],
    });
  }

  async findByParticipantId(participantId: string): Promise<MetaTraderAccount | null> {
    return await this.metaTraderAccountRepository.findOne({
      where: { marathonParticipantId: participantId },
      relations: ['user'],
    });
  }

  async assignToParticipant(accountId: string, assignDto: AssignAccountDto): Promise<MetaTraderAccount> {
    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if account exists and is available (within transaction)
      const account = await queryRunner.manager.findOne(MetaTraderAccount, {
        where: { id: accountId },
        lock: { mode: 'pessimistic_write' }, // Lock to prevent race conditions
      });

      if (!account) {
        throw new NotFoundException(`MetaTrader account with ID ${accountId} not found`);
      }

      // Check if account is already assigned
      if (account.marathonParticipantId) {
        throw new ConflictException('This account is already assigned to a marathon participant');
      }

      // Check if participant exists (within transaction)
      const participant = await queryRunner.manager.findOne(MarathonParticipant, {
        where: { id: assignDto.marathonParticipantId },
        relations: ['user', 'marathon'],
        lock: { mode: 'pessimistic_write' }, // Lock to prevent race conditions
      });

      if (!participant) {
        throw new NotFoundException(`Marathon participant with ID ${assignDto.marathonParticipantId} not found`);
      }

      // Check if participant already has an account assigned
      if (participant.metaTraderAccountId) {
        throw new ConflictException('This participant already has a MetaTrader account assigned');
      }

      // Update both sides of the relationship atomically
      account.marathonParticipantId = assignDto.marathonParticipantId;
      account.userId = participant.user?.id || null;

      participant.metaTraderAccountId = accountId;

      // Save both entities within transaction
      await queryRunner.manager.save(MetaTraderAccount, account);
      await queryRunner.manager.save(MarathonParticipant, participant);

      await queryRunner.commitTransaction();
      this.logger.log(`MetaTrader account ${accountId} assigned to participant ${assignDto.marathonParticipantId}`);

      // Return account with updated participant relation
      return await this.findById(accountId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error assigning account ${accountId} to participant:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async unassignFromParticipant(accountId: string): Promise<MetaTraderAccount> {
    const account = await this.findById(accountId);

    if (!account.marathonParticipantId) {
      throw new BadRequestException('This account is not assigned to any participant');
    }

    account.marathonParticipantId = null;
    account.userId = null;

    return await this.metaTraderAccountRepository.save(account);
  }

  async findAll(): Promise<MetaTraderAccount[]> {
    return await this.metaTraderAccountRepository.find({
      relations: ['user'],
    });
  }

  async remove(id: string): Promise<void> {
    const account = await this.findById(id);

    if (account.marathonParticipantId) {
      throw new BadRequestException('Cannot delete account that is assigned to a participant. Unassign it first.');
    }

    await this.metaTraderAccountRepository.remove(account);
  }
}

