import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { MarathonStatus } from '../marathon/enums/marathon-status.enum';
import { TokyoService } from '../tokyo/tokyo.service';
import { TokyoDataService } from './tokyo-data.service';

@Injectable()
export class TokyoDataCronService {
  private readonly logger = new Logger(TokyoDataCronService.name);

  constructor(
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @Inject(forwardRef(() => TokyoService))
    private readonly tokyoService: TokyoService,
    private readonly tokyoDataService: TokyoDataService,
  ) {}

  /**
   * Check for finished marathons and update participant account data
   */
  async updateFinishedMarathonData(): Promise<void> {
    try {
      const now = new Date();
      
      // Find finished marathons that ended recently (within last 24 hours)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const finishedMarathons = await this.marathonRepository
        .createQueryBuilder('marathon')
        .leftJoinAndSelect('marathon.participants', 'participants')
        .leftJoinAndSelect('participants.metaTraderAccount', 'metaTraderAccount')
        .where('marathon.status = :status', { status: MarathonStatus.FINISHED })
        .andWhere('marathon.endDate >= :oneDayAgo', { oneDayAgo })
        .andWhere('marathon.endDate <= :now', { now })
        .getMany();

      if (finishedMarathons.length === 0) {
        this.logger.debug('No finished marathons found to update');
        return;
      }

      this.logger.log(
        `Found ${finishedMarathons.length} finished marathon(s) to update`,
      );

      for (const marathon of finishedMarathons) {
        await this.updateMarathonParticipantsData(marathon.id);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update finished marathon data: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update data for all participants of a marathon
   */
  async updateMarathonParticipantsData(marathonId: string): Promise<void> {
    try {
      const participants = await this.participantRepository.find({
        where: {
          marathon: { id: marathonId },
          isActive: true,
        },
        relations: ['metaTraderAccount'],
      });

      if (participants.length === 0) {
        this.logger.debug(`No active participants found for marathon ${marathonId}`);
        return;
      }

      this.logger.log(
        `Updating data for ${participants.length} participant(s) in marathon ${marathonId}`,
      );

      for (const participant of participants) {
        if (!participant.metaTraderAccount) {
          this.logger.warn(
            `Participant ${participant.id} has no MetaTrader account`,
          );
          continue;
        }

        const accountLogin = participant.metaTraderAccount.login;
        
        try {
          // Fetch account data from Tokyo service
          const accountData = await this.tokyoService.getAccountData(accountLogin);
          
          if (accountData?.data) {
            await this.tokyoDataService.updateFromTokyoAPI(accountLogin, accountData.data);
            this.logger.debug(`Updated data for account ${accountLogin}`);
          }

          // Fetch performance data
          try {
            const performanceData = await this.tokyoService.getPerformanceReport(accountLogin);
            if (performanceData?.data) {
              await this.tokyoDataService.updateFromTokyoAPI(accountLogin, performanceData.data);
            }
          } catch (error) {
            this.logger.warn(
              `Failed to fetch performance for account ${accountLogin}: ${error.message}`,
            );
          }

          // Fetch transaction history
          try {
            const tradeHistory = await this.tokyoService.getTradeHistory(accountLogin);
            if (tradeHistory?.data && Array.isArray(tradeHistory.data)) {
              await this.tokyoDataService.updateFromTokyoAPI(accountLogin, {
                trades: tradeHistory.data,
              });
            }
          } catch (error) {
            this.logger.warn(
              `Failed to fetch trade history for account ${accountLogin}: ${error.message}`,
            );
          }

          // Fetch balance history
          try {
            const balanceHistory = await this.tokyoService.getBalanceHistory(accountLogin);
            if (balanceHistory?.data && Array.isArray(balanceHistory.data)) {
              await this.tokyoDataService.updateFromTokyoAPI(accountLogin, {
                balance_history: balanceHistory.data,
              });
            }
          } catch (error) {
            this.logger.warn(
              `Failed to fetch balance history for account ${accountLogin}: ${error.message}`,
            );
          }

          // Fetch equity history
          try {
            const equityHistory = await this.tokyoService.getEquityHistory(accountLogin);
            if (equityHistory?.data && Array.isArray(equityHistory.data)) {
              await this.tokyoDataService.updateFromTokyoAPI(accountLogin, {
                equity_history: equityHistory.data,
              });
            }
          } catch (error) {
            this.logger.warn(
              `Failed to fetch equity history for account ${accountLogin}: ${error.message}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to update data for account ${accountLogin}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Completed updating data for marathon ${marathonId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update marathon participants data for marathon ${marathonId}: ${error.message}`,
        error.stack,
      );
    }
  }
}

