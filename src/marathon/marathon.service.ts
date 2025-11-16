import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MetaTraderAccount, MetaTraderAccountStatus } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoService } from '../tokyo/tokyo.service';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Marathon } from './entities/marathon.entity';
import { PrizeStrategyConfig, PrizeStrategyType } from './entities/prize-strategy.types';
import { VirtualWalletService } from '../virtual-wallet/virtual-wallet.service';
import { VirtualWalletTransactionType } from '@/virtual-wallet/entities/virtual-wallet-transaction.entity';
import { MarathonStatus } from './enums/marathon-status.enum';
import { calculateMarathonLifecycleStatus } from './utils/marathon-status.util';
import { TokyoPerformance } from '../tokyo-data/entities/tokyo-performance.entity';
import { MarathonLeaderboardResponseDto, MarathonLeaderboardEntryDto, MarathonPnLHistoryResponseDto, ParticipantPnLHistoryDto, PnLHistoryPointDto } from './dto/marathon-response.dto';
import { TokyoDataService } from '../tokyo-data/tokyo-data.service';

@Injectable()
export class MarathonService {
  private readonly logger = new Logger(MarathonService.name);
  private readonly REFUND_RATE = 0.8;

  constructor(
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
    @InjectRepository(TokyoPerformance)
    private readonly performanceRepository: Repository<TokyoPerformance>,
    private readonly tokyoService: TokyoService,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly tokyoDataService: TokyoDataService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createMarathonDto: CreateMarathonDto): Promise<Marathon> {
    const { prizeStrategyType, prizeStrategyConfig, status, ...rest } = createMarathonDto;

    const marathon = this.marathonRepository.create({
      ...rest,
      prizeStrategyType: prizeStrategyType ?? PrizeStrategyType.WINNER_TAKE_ALL,
      prizeStrategyConfig: prizeStrategyConfig ?? this.getDefaultConfig(prizeStrategyType),
      status: status ?? calculateMarathonLifecycleStatus(rest.startDate, rest.endDate),
    });
    return await this.marathonRepository.save(marathon);
  }

  async findAll(): Promise<Marathon[]> {
    return await this.marathonRepository.find();
  }

  async findAllWithFilters(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    userId?: string,
    search?: string,
    status?: MarathonStatus,
  ): Promise<{ marathons: Marathon[]; total: number }> {
    let query = this.marathonRepository.createQueryBuilder('marathon');

    if (userId) {
      query = query
        .innerJoin('marathon.participants', 'filterParticipant', 'filterParticipant.user_id = :userId', { userId });
    }

    query = query.orderBy('marathon.createdAt', 'DESC');

    if (isActive !== undefined) {
      query = query.andWhere('marathon.isActive = :isActive', { isActive });
    }

    if (search) {
      query = query.andWhere('LOWER(marathon.name) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    if (status) {
      query = query.andWhere('marathon.status = :status', { status });
    }

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    const marathons = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { marathons, total };
  }

  async findOne(id: string): Promise<Marathon> {
    const marathon = await this.marathonRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${id} not found`);
    }

    return marathon;
  }

  async isUserParticipantOfMarathon(id: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: {
        marathon: { id: id },
        user: { id: userId },
        isActive: true,
      },
    });

    return !!participant;
  }

  async update(id: string, updateMarathonDto: UpdateMarathonDto): Promise<Marathon> {
    const marathon = await this.findOne(id);
    const { prizeStrategyType, prizeStrategyConfig, status, ...rest } = updateMarathonDto;
    const datesUpdated = 'startDate' in rest || 'endDate' in rest;

    Object.assign(marathon, rest);

    if (prizeStrategyType !== undefined) {
      marathon.prizeStrategyType = prizeStrategyType;
      if (prizeStrategyConfig === undefined) {
        marathon.prizeStrategyConfig = this.getDefaultConfig(prizeStrategyType);
      }
    }

    if (prizeStrategyConfig !== undefined) {
      marathon.prizeStrategyConfig =
        prizeStrategyConfig ?? this.getDefaultConfig(prizeStrategyType ?? marathon.prizeStrategyType);
    }

    if (status !== undefined) {
      marathon.status = status;
    } else if (datesUpdated && marathon.status !== MarathonStatus.CANCELED) {
      marathon.status = calculateMarathonLifecycleStatus(marathon.startDate, marathon.endDate);
    }

    return await this.marathonRepository.save(marathon);
  }

  async remove(id: string): Promise<void> {
    const result = await this.marathonRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Marathon with ID ${id} not found`);
    }
  }

  async joinMarathon(userId: string, marathonId: string): Promise<MarathonParticipant> {
    // Check if user is already a participant
    const existingParticipant = await this.participantRepository.findOne({
      where: {
        marathon: { id: marathonId },
        user: { id: userId },
      },
    });

    if (existingParticipant?.isActive) {
      throw new ConflictException('User is already a participant in this marathon');
    }

    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.cancelledAt = null;
      existingParticipant.refundTransactionId = null;
      return await this.participantRepository.save(existingParticipant);
    }

    // Create new participant
    const participant = this.participantRepository.create({
      marathon: { id: marathonId },
      user: { id: userId },
      isActive: true,
    });

    return await this.participantRepository.save(participant);
  }

  async getMarathonParticipants(
    marathonId: string,
  ): Promise<{ participants: MarathonParticipant[]; total: number; marathon: Marathon }> {
    // Check if marathon exists
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    const participants = await this.participantRepository.find({
      where: { marathon: { id: marathonId }, isActive: true },
      relations: ['marathon', 'user', 'user.profile', 'metaTraderAccount'],
      order: { createdAt: 'DESC' },
    });

    if (this.hasMarathonStarted(marathon)) {
      await this.deployParticipantAccounts(participants);
    }

    return {
      participants,
      total: participants.length,
      marathon,
    };
  }

  async cancelParticipation(userId: string, marathonId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const participant = await queryRunner.manager.findOne(MarathonParticipant, {
        where: {
          marathon: { id: marathonId },
          user: { id: userId },
        },
        relations: ['marathon'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found for this marathon');
      }

      if (!participant.isActive) {
        throw new ConflictException('Participation already cancelled');
      }

      const marathon = participant.marathon
        ? participant.marathon
        : await queryRunner.manager.findOne(Marathon, {
            where: { id: marathonId },
            lock: { mode: 'pessimistic_write' },
          });

      if (!marathon) {
        throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
      }

      if (this.hasMarathonStarted(marathon)) {
        throw new BadRequestException('Cannot cancel participation after the marathon has started');
      }

      const refundAmount = this.calculateRefundAmount(Number(marathon.entryFee));

      const metaTraderAccount = await queryRunner.manager.findOne(MetaTraderAccount, {
        where: { marathonParticipantId: participant.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (metaTraderAccount) {
        metaTraderAccount.marathonParticipantId = null;
        metaTraderAccount.userId = null;
        await queryRunner.manager.save(MetaTraderAccount, metaTraderAccount);
      }

      const now = new Date();
      participant.isActive = false;
      participant.cancelledAt = now;
      participant.metaTraderAccountId = null;

      const currentPlayers = Number(marathon.currentPlayers) || 0;
      marathon.currentPlayers = currentPlayers > 0 ? currentPlayers - 1 : 0;

      await queryRunner.manager.save(MarathonParticipant, participant);
      await queryRunner.manager.save(Marathon, marathon);

      const uniqueReferenceId = `${participant.id}:${now.getTime()}`;

      const transaction = await this.virtualWalletService.credit(
        {
          userId,
          amount: refundAmount,
          type: VirtualWalletTransactionType.REFUND,
          referenceType: 'marathon_participation',
          referenceId: uniqueReferenceId,
          description: `Refund for cancelling marathon ${marathon.name}`,
          metadata: {
            participantId: participant.id,
            marathonId,
            refundedAt: now.toISOString(),
            refundRate: this.REFUND_RATE,
          },
        },
        queryRunner,
      );

      participant.refundTransactionId = transaction.id;
      await queryRunner.manager.save(MarathonParticipant, participant);

      await queryRunner.commitTransaction();

      return {
        participantId: participant.id,
        marathonId,
        refundedAmount: refundAmount,
        refundRate: this.REFUND_RATE,
        refundTransactionId: transaction.id,
        walletBalance: Number(transaction.balanceAfter),
        cancelledAt: now,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private hasMarathonStarted(marathon: Marathon): boolean {
    if (!marathon?.startDate) {
      return false;
    }

    return marathon.startDate.getTime() <= Date.now();
  }

  private async deployParticipantAccounts(participants: MarathonParticipant[]): Promise<void> {
    for (const participant of participants) {
      const account = participant.metaTraderAccount;
      if (!account?.login) {
        continue;
      }

      if (account.status === MetaTraderAccountStatus.DEPLOYED) {
        continue;
      }

      try {
        await this.tokyoService.deployAccountWithAutoCreate(account);
        account.status = MetaTraderAccountStatus.DEPLOYED;
        await this.metaTraderAccountRepository.save(account);
      } catch (error) {
        this.logger.warn(
          `Failed to deploy MetaTrader account ${account.login} for participant ${participant.id}: ${error.message}`,
        );
      }
    }
  }

  private getDefaultConfig(type?: PrizeStrategyType): PrizeStrategyConfig | null {
    switch (type ?? PrizeStrategyType.WINNER_TAKE_ALL) {
      case PrizeStrategyType.WINNER_TAKE_ALL:
        return {
          placements: [
            {
              position: 1,
              percentage: 100,
            },
          ],
        };
      default:
        return null;
    }
  }

  private calculateRefundAmount(entryFee: number): number {
    const normalizedEntryFee = Number(entryFee) || 0;
    const refund = normalizedEntryFee * this.REFUND_RATE;
    return Number((Math.round(refund * 100) / 100).toFixed(2));
  }

  /**
   * Get leaderboard for a marathon based on P&L
   */
  async getMarathonLeaderboard(marathonId: string): Promise<MarathonLeaderboardResponseDto> {
    // Check if marathon exists
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    // Get all active participants with their accounts
    const participants = await this.participantRepository.find({
      where: { marathon: { id: marathonId }, isActive: true },
      relations: ['user', 'user.profile', 'metaTraderAccount'],
    });

    const entries: MarathonLeaderboardEntryDto[] = [];

    for (const participant of participants) {
      if (!participant.metaTraderAccount?.id) {
        continue;
      }

      // Get performance data
      const performance = await this.performanceRepository.findOne({
        where: { metaTraderAccountId: participant.metaTraderAccount.id },
      });

      // Calculate P&L (totalNetProfit), totalTrades, and winrate
      const pnl = performance?.totalNetProfit ?? 0;
      const totalTrades = performance?.totalTrades ?? 0;
      const profitTrades = performance?.profitTrades ?? 0;
      
      // Calculate winrate: (profitTrades / totalTrades) * 100
      const winrate = totalTrades > 0 
        ? Number(((profitTrades / totalTrades) * 100).toFixed(2))
        : 0;

      // Get user name
      const userName = participant.user.profile?.firstName
        ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
        : participant.user.email;

      entries.push({
        rank: 0, // Will be assigned after sorting
        participantId: participant.id,
        userId: participant.user.id,
        userName,
        accountLogin: participant.metaTraderAccount.login,
        pnl: Number(pnl),
        totalTrades,
        winrate,
      });
    }

    // Sort by P&L descending (highest first)
    entries.sort((a, b) => b.pnl - a.pnl);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return {
      marathonId: marathon.id,
      marathonName: marathon.name,
      totalParticipants: entries.length,
      entries,
    };
  }

  /**
   * Get P&L history for all participants in a marathon
   */
  async getMarathonPnLHistory(
    marathonId: string,
    from?: Date,
    to?: Date,
  ): Promise<MarathonPnLHistoryResponseDto> {
    // Check if marathon exists
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    // Set default date range to marathon period if not provided
    const startDate = from || marathon.startDate;
    const endDate = to || marathon.endDate || new Date();

    // Get all active participants with their accounts
    const participants = await this.participantRepository.find({
      where: { marathon: { id: marathonId }, isActive: true },
      relations: ['user', 'user.profile', 'metaTraderAccount'],
    });

    const participantsHistory: ParticipantPnLHistoryDto[] = [];

    for (const participant of participants) {
      if (!participant.metaTraderAccount?.id) {
        continue;
      }

      // Get balance history for this account
      const balanceHistory = await this.tokyoDataService.getBalanceHistory(
        participant.metaTraderAccount.id,
        startDate,
        endDate,
      );

      if (balanceHistory.length === 0) {
        continue;
      }

      // Get initial balance (use first balance point in the history as initial balance)
      // This represents the starting balance at the beginning of the period
      let initialBalance = 0;
      if (balanceHistory.length > 0) {
        // Use first balance point as initial balance
        initialBalance = Number(balanceHistory[0].balance);
        
        // Try to get more accurate initial balance from performance data if available
        const performance = await this.performanceRepository.findOne({
          where: { metaTraderAccountId: participant.metaTraderAccount.id },
        });
        
        // If we have performance data with balance and profit, use it for more accuracy
        if (performance?.balance && performance?.profit !== null && performance?.profit !== undefined) {
          const calculatedInitialBalance = Number(performance.balance) - Number(performance.profit);
          // Use the calculated initial balance if it's reasonable (positive and close to first balance)
          if (calculatedInitialBalance > 0 && Math.abs(calculatedInitialBalance - initialBalance) < initialBalance * 0.1) {
            initialBalance = calculatedInitialBalance;
          }
        }
      }

      // Calculate P&L history points from balance history
      const historyPoints: PnLHistoryPointDto[] = balanceHistory.map((point) => {
        const balance = Number(point.balance);
        const pnl = balance - initialBalance;
        
        return {
          timestamp: point.time,
          pnl: Number(pnl.toFixed(2)),
          balance: Number(balance.toFixed(2)),
        };
      });

      // Get user name
      const userName = participant.user.profile?.firstName
        ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
        : participant.user.email;

      participantsHistory.push({
        participantId: participant.id,
        userId: participant.user.id,
        userName,
        accountLogin: participant.metaTraderAccount.login,
        initialBalance: Number(initialBalance.toFixed(2)),
        history: historyPoints,
      });
    }

    return {
      marathonId: marathon.id,
      marathonName: marathon.name,
      participants: participantsHistory,
    };
  }
} 