import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository, In } from 'typeorm';
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
import { TokyoTransactionHistory } from '../tokyo-data/entities/tokyo-transaction-history.entity';
import { TokyoBalanceHistory } from '../tokyo-data/entities/tokyo-balance-history.entity';
import { TokyoEquityHistory } from '../tokyo-data/entities/tokyo-equity-history.entity';
import { MarathonLeaderboardResponseDto, MarathonLeaderboardEntryDto, MarathonPnLHistoryResponseDto, ParticipantPnLHistoryDto, PnLHistoryPointDto, MarathonTradeHistoryResponseDto, ParticipantTradeHistoryDto, TradeDto, ParticipantAnalysisDto, PerformanceMetricsDto, DrawdownMetricsDto, FloatingRiskDto, EquityBalanceHistoryPointDto, SymbolStatsDto, TradeHistoryDto } from './dto/marathon-response.dto';
import { LiveAccountDataService } from './live-account-data.service';
import { TokyoDataService } from '../tokyo-data/tokyo-data.service';
import { ParticipantAnalysisQueryDto, AnalysisSection, TradeHistorySortBy, HistoryResolution } from './dto/participant-analysis-query.dto';
import { DashboardResponseDto, TradesWinrateDto, CurrencyPairsDto, CurrencyPairSeriesDto, CurrencyPairsTreemapDto, CurrencyPairTreemapByTradesDto, CurrencyPairTreemapPerformanceDto, CurrencyPairsWinrateDto, CurrencyPairsWinrateSeriesDto, TradesShortLongDto, TradesShortLongSeriesDto, BestMarathonDto, LastMarathonDto, LastTradeDto, UserDetailsDto, UserStatsDto } from './dto/dashboard-response.dto';
import { LiveResponseDto, MarathonLiveDto, RiskMetricsDto, TradeHistoryItemDto, CurrencyPairsDto as LiveCurrencyPairsDto, TradesShortLongDto as LiveTradesShortLongDto, EquityBalanceDto, UserDetailsDto as LiveUserDetailsDto } from './dto/live-response.dto';
import { MarathonLeaderboardService } from './marathon-leaderboard.service';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';
import { SettingsService } from '../settings/settings.service';
import { ProfileVisibility } from '../settings/entities/user-settings.entity';

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
    @InjectRepository(TokyoTransactionHistory)
    private readonly transactionHistoryRepository: Repository<TokyoTransactionHistory>,
    @InjectRepository(TokyoBalanceHistory)
    private readonly balanceHistoryRepository: Repository<TokyoBalanceHistory>,
    @InjectRepository(TokyoEquityHistory)
    private readonly equityHistoryRepository: Repository<TokyoEquityHistory>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private readonly tokyoService: TokyoService,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly tokyoDataService: TokyoDataService,
    private readonly liveAccountDataService: LiveAccountDataService,
    private readonly leaderboardService: MarathonLeaderboardService,
    private readonly settingsService: SettingsService,
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

  /**
   * Get participant by ID with relations
   */
  async getParticipantById(participantId: string): Promise<MarathonParticipant | null> {
    return await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ['marathon', 'user', 'metaTraderAccount'],
    });
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

  /**
   * Get trade history for all participants in a marathon
   */
  async getMarathonTradeHistory(
    marathonId: string,
    from?: Date,
    to?: Date,
    limit?: number,
  ): Promise<MarathonTradeHistoryResponseDto> {
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

    const participantsHistory: ParticipantTradeHistoryDto[] = [];

    for (const participant of participants) {
      if (!participant.metaTraderAccount?.id) {
        continue;
      }

      // Get trade history for this account
      const transactions = await this.tokyoDataService.getTransactionHistoryByDateRange(
        participant.metaTraderAccount.id,
        startDate,
        endDate,
        limit,
      );

      // Map transactions to DTO (only include requested fields)
      const tradeDtos: TradeDto[] = transactions.map((tx) => ({
        type: tx.type ?? null,
        volume: tx.volume ? Number(tx.volume) : null,
        entry: tx.openPrice ? Number(tx.openPrice) : null,
        openTime: tx.openTime ?? null,
        symbol: tx.symbol ?? null,
        profit: tx.profit ? Number(tx.profit) : null,
      }));

      // Get user name
      const userName = participant.user.profile?.firstName
        ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
        : participant.user.email;

      participantsHistory.push({
        participantId: participant.id,
        userId: participant.user.id,
        userName,
        accountLogin: participant.metaTraderAccount.login,
        totalTrades: tradeDtos.length,
        trades: tradeDtos,
      });
    }

    return {
      marathonId: marathon.id,
      marathonName: marathon.name,
      participants: participantsHistory,
    };
  }

  /**
   * Get trade history for a specific participant in a marathon
   */
  async getParticipantTradeHistory(
    marathonId: string,
    participantId: string,
    from?: Date,
    to?: Date,
    limit?: number,
    isPublic: boolean = false,
  ): Promise<ParticipantTradeHistoryDto> {
    // Check if marathon exists
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    // Get participant with relations
    const participant = await this.participantRepository.findOne({
      where: { id: participantId, marathon: { id: marathonId } },
      relations: ['user', 'user.profile', 'metaTraderAccount', 'marathon'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${participantId} not found in marathon ${marathonId}`);
    }

    // Check profile visibility if this is a public request
    if (isPublic) {
      const userId = participant.user.id;
      const settings = await this.settingsService.getOrCreateSettings(userId);
      if (settings.profileVisibility === ProfileVisibility.PRIVATE) {
        throw new ForbiddenException('This profile is private and cannot be accessed publicly');
      }
    }

    if (!participant.metaTraderAccount?.id) {
      throw new NotFoundException(`Participant ${participantId} does not have a MetaTrader account`);
    }

    // Set default date range to marathon period if not provided
    const startDate = from || marathon.startDate;
    const endDate = to || marathon.endDate || new Date();

    // Get trade history for this account
    const transactions = await this.tokyoDataService.getTransactionHistoryByDateRange(
      participant.metaTraderAccount.id,
      startDate,
      endDate,
      limit,
    );

    // Map transactions to DTO (only include requested fields)
    const tradeDtos: TradeDto[] = transactions.map((tx) => ({
      type: tx.type ?? null,
      volume: tx.volume ? Number(tx.volume) : null,
      entry: tx.openPrice ? Number(tx.openPrice) : null,
      openTime: tx.openTime ?? null,
      symbol: tx.symbol ?? null,
      profit: tx.profit ? Number(tx.profit) : null,
    }));

    // Get user name
    const userName = participant.user.profile?.firstName
      ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
      : participant.user.email;

    return {
      participantId: participant.id,
      userId: participant.user.id,
      userName,
      accountLogin: participant.metaTraderAccount.login,
      totalTrades: tradeDtos.length,
      trades: tradeDtos,
    };
  }

  /**
   * Get comprehensive analysis for a specific participant
   */
  async getParticipantAnalysis(
    marathonId: string,
    participantId: string,
    query: ParticipantAnalysisQueryDto,
  ): Promise<Partial<ParticipantAnalysisDto>> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    // Check if marathon exists
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    // Get participant
    const participant = await this.participantRepository.findOne({
      where: { 
        id: participantId,
        marathon: { id: marathonId },
        isActive: true,
      },
      relations: ['user', 'user.profile', 'metaTraderAccount'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${participantId} not found in this marathon`);
    }

    if (!participant.metaTraderAccount?.id) {
      throw new NotFoundException(`Participant does not have a MetaTrader account`);
    }

    const accountId = participant.metaTraderAccount.id;
    const accountLogin = participant.metaTraderAccount.login;

    // Set default date range to marathon period if not provided
    const startDate = from || marathon.startDate;
    const endDate = to || marathon.endDate || new Date();

    // Determine which sections to include
    const sections = query.sections?.length 
      ? query.sections 
      : Object.values(AnalysisSection);
    
    const shouldInclude = (section: AnalysisSection) => sections.includes(section);

    // Initialize result
    const result: Partial<ParticipantAnalysisDto> = {
      participantId: participant.id,
      userId: participant.user.id,
      userName: participant.user.profile?.firstName
        ? `${participant.user.profile.firstName} ${participant.user.profile.lastName || ''}`.trim()
        : participant.user.email,
      accountLogin,
    };

    // Get performance data (needed for multiple sections)
    const needsPerformanceData = shouldInclude(AnalysisSection.PERFORMANCE) || 
                                  shouldInclude(AnalysisSection.DRAWDOWN) ||
                                  !query.sections;
    
    let performance: TokyoPerformance | null = null;
    let totalTrades = 0;
    let profitTrades = 0;
    let lossTrades = 0;
    let winrate = 0;

    if (needsPerformanceData) {
      performance = await this.performanceRepository.findOne({
        where: { metaTraderAccountId: accountId },
      });

      // Calculate winrate
      totalTrades = performance?.totalTrades ?? 0;
      profitTrades = performance?.profitTrades ?? 0;
      lossTrades = performance?.lossTrades ?? 0;
      winrate = totalTrades > 0 
        ? Number(((profitTrades / totalTrades) * 100).toFixed(2))
        : 0;
    }

    // Add performance metrics if requested
    if (shouldInclude(AnalysisSection.PERFORMANCE)) {
      result.performance = {
        winrate,
        totalNetProfit: performance?.totalNetProfit ? Number(performance.totalNetProfit) : null,
        grossProfit: performance?.grossProfit ? Number(performance.grossProfit) : null,
        grossLoss: performance?.grossLoss ? Number(performance.grossLoss) : null,
        profitFactor: performance?.profitFactor ? Number(performance.profitFactor) : null,
        expectedPayoff: performance?.expectedPayoff ? Number(performance.expectedPayoff) : null,
        sharpeRatio: performance?.sharpeRatio ? Number(performance.sharpeRatio) : null,
        recoveryFactor: performance?.recoveryFactor ? Number(performance.recoveryFactor) : null,
      };
      result.totalTrades = totalTrades;
      result.winTrades = profitTrades;
      result.lossTrades = lossTrades;
    }

    // Add drawdown metrics if requested
    if (shouldInclude(AnalysisSection.DRAWDOWN)) {
      result.drawdown = {
        balanceDrawdownAbsolute: performance?.balanceDrawdownAbsolute ? Number(performance.balanceDrawdownAbsolute) : null,
        balanceDrawdownMaximal: performance?.balanceDrawdownMaximal ? Number(performance.balanceDrawdownMaximal) : null,
        balanceDrawdownRelativePercent: performance?.balanceDrawdownRelativePercent ? Number(performance.balanceDrawdownRelativePercent) : null,
      };
    }

    // Get live data for floating risk and open positions/orders
    const needsLiveData = shouldInclude(AnalysisSection.FLOATING_RISK) ||
                          shouldInclude(AnalysisSection.OPEN_POSITIONS) ||
                          shouldInclude(AnalysisSection.OPEN_ORDERS);
    
    if (needsLiveData) {
      const liveSnapshot = this.liveAccountDataService.getSnapshot(accountLogin);
      const openPositions = liveSnapshot?.positions ?? [];
      const openOrders = liveSnapshot?.orders ?? [];
      const currentProfit = liveSnapshot?.profit ?? null;
      const currentEquity = liveSnapshot?.equity ?? null;
      const currentBalance = liveSnapshot?.balance ?? null;

      // Add floating risk if requested
      if (shouldInclude(AnalysisSection.FLOATING_RISK)) {
        let totalOpenVolume: number | null = null;
        if (openPositions && openPositions.length > 0) {
          totalOpenVolume = openPositions.reduce((sum, pos) => {
            const volume = pos.volume ?? 0;
            return sum + Number(volume);
          }, 0);
        }

        const floatingRiskPercent = currentEquity && currentProfit !== null
          ? Number(((Math.abs(currentProfit) / currentEquity) * 100).toFixed(2))
          : null;

        result.floatingRisk = {
          floatingPnL: currentProfit !== null ? Number(currentProfit) : null,
          floatingRiskPercent,
          openPositionsCount: openPositions?.length ?? 0,
          totalOpenVolume,
        };
      }

      // Add open positions if requested
      if (shouldInclude(AnalysisSection.OPEN_POSITIONS)) {
        result.openPositions = query.includeDetailedPositions ? openPositions : openPositions;
        result.currentBalance = currentBalance !== null ? Number(currentBalance) : null;
        result.currentEquity = currentEquity !== null ? Number(currentEquity) : null;
      }

      // Add open orders if requested
      if (shouldInclude(AnalysisSection.OPEN_ORDERS)) {
        result.openOrders = openOrders;
      }
    }

    // Get equity and balance history if requested
    if (shouldInclude(AnalysisSection.EQUITY_BALANCE_HISTORY)) {
      const balanceHistory = await this.tokyoDataService.getBalanceHistory(accountId, startDate, endDate);
      const equityHistory = await this.tokyoDataService.getEquityHistory(accountId, startDate, endDate);

      // Merge balance and equity history
      const equityMap = new Map<string, number>();
      equityHistory.forEach((point) => {
        const key = point.time.toISOString();
        equityMap.set(key, Number(point.equity));
      });

      let equityBalanceHistory: EquityBalanceHistoryPointDto[] = balanceHistory.map((point) => {
        const key = point.time.toISOString();
        return {
          timestamp: point.time,
          balance: Number(point.balance),
          equity: equityMap.has(key) ? equityMap.get(key)! : null,
        };
      });

      // Apply resolution aggregation if specified
      if (query.historyResolution && query.historyResolution !== HistoryResolution.RAW) {
        equityBalanceHistory = this.aggregateHistory(equityBalanceHistory, query.historyResolution);
      }

      // Apply limit if specified
      if (query.historyLimit && equityBalanceHistory.length > query.historyLimit) {
        // Sample evenly across the dataset
        const step = Math.ceil(equityBalanceHistory.length / query.historyLimit);
        equityBalanceHistory = equityBalanceHistory.filter((_, index) => index % step === 0);
      }

      result.equityBalanceHistory = equityBalanceHistory;
    }

    // Get transaction history if needed for trade history or stats per symbol
    const needsTransactions = shouldInclude(AnalysisSection.TRADE_HISTORY) ||
                               shouldInclude(AnalysisSection.STATS_PER_SYMBOL);
    
    if (needsTransactions) {
      let transactions = await this.tokyoDataService.getTransactionHistoryByDateRange(
        accountId,
        startDate,
        endDate,
      );

      // Apply symbol filter if specified
      if (query.tradeSymbols?.length) {
        transactions = transactions.filter(tx => 
          tx.symbol && query.tradeSymbols!.includes(tx.symbol.toUpperCase())
        );
      }

      // Apply profit filters
      if (query.onlyProfitableTrades) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) > 0);
      } else if (query.onlyLosingTrades) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) < 0);
      }

      if (query.minProfit !== undefined) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) >= query.minProfit!);
      }

      if (query.maxProfit !== undefined) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) <= query.maxProfit!);
      }

      // Calculate stats per symbol if requested
      if (shouldInclude(AnalysisSection.STATS_PER_SYMBOL)) {
        const symbolStatsMap = new Map<string, {
          totalTrades: number;
          winTrades: number;
          lossTrades: number;
          profit: number;
        }>();

        transactions.forEach((tx) => {
          if (!tx.symbol) return;

          const stats = symbolStatsMap.get(tx.symbol) || {
            totalTrades: 0,
            winTrades: 0,
            lossTrades: 0,
            profit: 0,
          };

          stats.totalTrades++;
          const profit = Number(tx.profit ?? 0);
          stats.profit += profit;

          if (profit > 0) {
            stats.winTrades++;
          } else if (profit < 0) {
            stats.lossTrades++;
          }

          symbolStatsMap.set(tx.symbol, stats);
        });

        let statsPerSymbol: SymbolStatsDto[] = Array.from(symbolStatsMap.entries()).map(([symbol, stats]) => {
          const symbolWinrate = stats.totalTrades > 0
            ? Number(((stats.winTrades / stats.totalTrades) * 100).toFixed(2))
            : 0;
          const averageProfit = stats.totalTrades > 0
            ? Number((stats.profit / stats.totalTrades).toFixed(2))
            : 0;

          return {
            symbol,
            totalTrades: stats.totalTrades,
            winTrades: stats.winTrades,
            lossTrades: stats.lossTrades,
            winrate: symbolWinrate,
            profit: Number(stats.profit.toFixed(2)),
            averageProfit,
          };
        });

        // Sort by total trades descending
        statsPerSymbol.sort((a, b) => b.totalTrades - a.totalTrades);

        // Apply top symbols limit if specified
        if (query.topSymbolsLimit && statsPerSymbol.length > query.topSymbolsLimit) {
          statsPerSymbol = statsPerSymbol.slice(0, query.topSymbolsLimit);
        }

        result.statsPerSymbol = statsPerSymbol;
      }

      // Map trade history if requested
      if (shouldInclude(AnalysisSection.TRADE_HISTORY)) {
        // Apply sorting
        if (query.tradeHistorySortBy) {
          transactions = this.sortTransactions(transactions, query.tradeHistorySortBy);
        }

        // Apply limit
        if (query.tradeHistoryLimit && transactions.length > query.tradeHistoryLimit) {
          transactions = transactions.slice(0, query.tradeHistoryLimit);
        }

        const tradeHistory: TradeHistoryDto[] = transactions.map((tx) => ({
          positionId: tx.positionId ?? null,
          orderTicket: tx.orderTicket ?? null,
          type: tx.type ?? null,
          symbol: tx.symbol ?? null,
          volume: tx.volume ? Number(tx.volume) : null,
          openPrice: tx.openPrice ? Number(tx.openPrice) : null,
          closePrice: tx.closePrice ? Number(tx.closePrice) : null,
          openTime: tx.openTime ?? null,
          closeTime: tx.closeTime ?? null,
          profit: tx.profit ? Number(tx.profit) : null,
          commission: tx.commission ? Number(tx.commission) : null,
          swap: tx.swap ? Number(tx.swap) : null,
          stopLoss: tx.stopLoss ? Number(tx.stopLoss) : null,
          takeProfit: tx.takeProfit ? Number(tx.takeProfit) : null,
        }));

        result.tradeHistory = tradeHistory;
      }
    }

    return result;
  }

  /**
   * Get aggregated analysis for a user across all their participants and accounts
   * Aggregates data from all marathons and accounts as if they were one account
   */
  async getUserAggregatedAnalysis(
    userId: string,
    query: ParticipantAnalysisQueryDto,
  ): Promise<Partial<ParticipantAnalysisDto>> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    // Get all participants for the user across all marathons
    const participants = await this.participantRepository.find({
      where: { 
        user: { id: userId },
        isActive: true,
      },
      relations: ['user', 'user.profile', 'metaTraderAccount', 'marathon'],
    });

    if (participants.length === 0) {
      throw new NotFoundException(`No active participants found for user ${userId}`);
    }

    // Get all account IDs
    const accountIds = participants
      .map(p => p.metaTraderAccount?.id)
      .filter((id): id is string => id !== null && id !== undefined);

    if (accountIds.length === 0) {
      throw new NotFoundException(`No MetaTrader accounts found for user ${userId}`);
    }

    const user = participants[0].user;
    const userName = user.profile?.firstName
      ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
      : user.email;

    // Determine which sections to include
    const sections = query.sections?.length 
      ? query.sections 
      : Object.values(AnalysisSection);
    
    const shouldInclude = (section: AnalysisSection) => sections.includes(section);

    // Initialize result
    const result: Partial<ParticipantAnalysisDto> = {
      userId: user.id,
      userName,
      accountLogin: null, // Multiple accounts, so no single login
    };

    // Set date range - if not provided, use marathon date ranges
    let startDate: Date | undefined = from ? new Date(from) : undefined;
    let endDate: Date = to ? new Date(to) : new Date();

    // If date range not provided, calculate from marathon periods
    if (!from || !to) {
      const marathonDates = participants
        .map(p => p.marathon)
        .filter((m): m is Marathon => m !== null && m !== undefined)
        .map(m => ({ start: m.startDate, end: m.endDate || new Date() }));

      if (marathonDates.length > 0) {
        const earliestStart = marathonDates.reduce((earliest, current) => 
          current.start < earliest.start ? current : earliest
        );
        const latestEnd = marathonDates.reduce((latest, current) => 
          current.end > latest.end ? current : latest
        );

        if (!from) {
          startDate = earliestStart.start;
        }
        if (!to) {
          endDate = latestEnd.end;
        }
      }
    }

    // Get performance data from all accounts
    const needsPerformanceData = shouldInclude(AnalysisSection.PERFORMANCE) || 
                                  shouldInclude(AnalysisSection.DRAWDOWN) ||
                                  !query.sections;
    
    let aggregatedPerformance: {
      totalTrades: number;
      profitTrades: number;
      lossTrades: number;
      totalNetProfit: number;
      grossProfit: number;
      grossLoss: number;
      balanceDrawdownAbsolute: number;
      balanceDrawdownMaximal: number;
      balanceDrawdownRelativePercent: number;
    } = {
      totalTrades: 0,
      profitTrades: 0,
      lossTrades: 0,
      totalNetProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      balanceDrawdownAbsolute: 0,
      balanceDrawdownMaximal: 0,
      balanceDrawdownRelativePercent: 0,
    };

    if (needsPerformanceData) {
      const performances = await this.performanceRepository.find({
        where: { metaTraderAccountId: In(accountIds) },
      });

      // Aggregate performance metrics
      performances.forEach(perf => {
        aggregatedPerformance.totalTrades += perf.totalTrades ?? 0;
        aggregatedPerformance.profitTrades += perf.profitTrades ?? 0;
        aggregatedPerformance.lossTrades += perf.lossTrades ?? 0;
        aggregatedPerformance.totalNetProfit += Number(perf.totalNetProfit ?? 0);
        aggregatedPerformance.grossProfit += Number(perf.grossProfit ?? 0);
        aggregatedPerformance.grossLoss += Number(perf.grossLoss ?? 0);
        
        // For drawdown, take the maximum
        const drawdownAbsolute = Number(perf.balanceDrawdownAbsolute ?? 0);
        const drawdownMaximal = Number(perf.balanceDrawdownMaximal ?? 0);
        if (drawdownAbsolute > aggregatedPerformance.balanceDrawdownAbsolute) {
          aggregatedPerformance.balanceDrawdownAbsolute = drawdownAbsolute;
        }
        if (drawdownMaximal > aggregatedPerformance.balanceDrawdownMaximal) {
          aggregatedPerformance.balanceDrawdownMaximal = drawdownMaximal;
        }
        const drawdownPercent = Number(perf.balanceDrawdownRelativePercent ?? 0);
        if (drawdownPercent > aggregatedPerformance.balanceDrawdownRelativePercent) {
          aggregatedPerformance.balanceDrawdownRelativePercent = drawdownPercent;
        }
      });
    }

    const winrate = aggregatedPerformance.totalTrades > 0 
      ? Number(((aggregatedPerformance.profitTrades / aggregatedPerformance.totalTrades) * 100).toFixed(2))
      : 0;

    const profitFactor = aggregatedPerformance.grossLoss !== 0
      ? Number((aggregatedPerformance.grossProfit / Math.abs(aggregatedPerformance.grossLoss)).toFixed(2))
      : aggregatedPerformance.grossProfit > 0 ? null : null;

    const expectedPayoff = aggregatedPerformance.totalTrades > 0
      ? Number((aggregatedPerformance.totalNetProfit / aggregatedPerformance.totalTrades).toFixed(2))
      : null;

    // Add performance metrics if requested
    if (shouldInclude(AnalysisSection.PERFORMANCE)) {
      result.performance = {
        winrate,
        totalNetProfit: aggregatedPerformance.totalNetProfit !== 0 ? aggregatedPerformance.totalNetProfit : null,
        grossProfit: aggregatedPerformance.grossProfit !== 0 ? aggregatedPerformance.grossProfit : null,
        grossLoss: aggregatedPerformance.grossLoss !== 0 ? aggregatedPerformance.grossLoss : null,
        profitFactor,
        expectedPayoff,
        sharpeRatio: null, // Cannot calculate aggregated sharpe ratio easily
        recoveryFactor: null, // Cannot calculate aggregated recovery factor easily
      };
      result.totalTrades = aggregatedPerformance.totalTrades;
      result.winTrades = aggregatedPerformance.profitTrades;
      result.lossTrades = aggregatedPerformance.lossTrades;
    }

    // Add drawdown metrics if requested
    if (shouldInclude(AnalysisSection.DRAWDOWN)) {
      result.drawdown = {
        balanceDrawdownAbsolute: aggregatedPerformance.balanceDrawdownAbsolute !== 0 ? aggregatedPerformance.balanceDrawdownAbsolute : null,
        balanceDrawdownMaximal: aggregatedPerformance.balanceDrawdownMaximal !== 0 ? aggregatedPerformance.balanceDrawdownMaximal : null,
        balanceDrawdownRelativePercent: aggregatedPerformance.balanceDrawdownRelativePercent !== 0 ? aggregatedPerformance.balanceDrawdownRelativePercent : null,
      };
    }

    // Get live data for floating risk and open positions/orders
    const needsLiveData = shouldInclude(AnalysisSection.FLOATING_RISK) ||
                          shouldInclude(AnalysisSection.OPEN_POSITIONS) ||
                          shouldInclude(AnalysisSection.OPEN_ORDERS);
    
    if (needsLiveData) {
      const allSnapshots = this.liveAccountDataService.getAllSnapshots();
      let totalFloatingPnL = 0;
      let totalEquity = 0;
      let totalBalance = 0;
      let totalOpenPositions: any[] = [];
      let totalOpenOrders: any[] = [];

      // Aggregate live data from all accounts
      participants.forEach(participant => {
        const accountLogin = participant.metaTraderAccount?.login;
        if (accountLogin) {
          const snapshot = allSnapshots.get(accountLogin);
          if (snapshot) {
            totalFloatingPnL += Number(snapshot.profit ?? 0);
            totalEquity += Number(snapshot.equity ?? 0);
            totalBalance += Number(snapshot.balance ?? 0);
            if (snapshot.positions) {
              totalOpenPositions = totalOpenPositions.concat(snapshot.positions);
            }
            if (snapshot.orders) {
              totalOpenOrders = totalOpenOrders.concat(snapshot.orders);
            }
          }
        }
      });

      // Add floating risk if requested
      if (shouldInclude(AnalysisSection.FLOATING_RISK)) {
        let totalOpenVolume: number | null = null;
        if (totalOpenPositions && totalOpenPositions.length > 0) {
          totalOpenVolume = totalOpenPositions.reduce((sum, pos) => {
            const volume = pos.volume ?? 0;
            return sum + Number(volume);
          }, 0);
        }

        const floatingRiskPercent = totalEquity !== 0 && totalFloatingPnL !== null
          ? Number(((Math.abs(totalFloatingPnL) / totalEquity) * 100).toFixed(2))
          : null;

        result.floatingRisk = {
          floatingPnL: totalFloatingPnL !== 0 ? totalFloatingPnL : null,
          floatingRiskPercent,
          openPositionsCount: totalOpenPositions?.length ?? 0,
          totalOpenVolume,
        };
      }

      // Add open positions if requested
      if (shouldInclude(AnalysisSection.OPEN_POSITIONS)) {
        result.openPositions = query.includeDetailedPositions ? totalOpenPositions : totalOpenPositions;
        result.currentBalance = totalBalance !== 0 ? totalBalance : null;
        result.currentEquity = totalEquity !== 0 ? totalEquity : null;
      }

      // Add open orders if requested
      if (shouldInclude(AnalysisSection.OPEN_ORDERS)) {
        result.openOrders = totalOpenOrders;
      }
    }

    // Get equity and balance history from all accounts
    if (shouldInclude(AnalysisSection.EQUITY_BALANCE_HISTORY)) {
      // Query balance history from all accounts
      const balanceHistoryQuery = this.balanceHistoryRepository
        .createQueryBuilder('history')
        .where('history.metaTraderAccountId IN (:...accountIds)', { accountIds })
        .orderBy('history.time', 'ASC');

      if (startDate) {
        balanceHistoryQuery.andWhere('history.time >= :startDate', { startDate });
      }
      if (endDate) {
        balanceHistoryQuery.andWhere('history.time <= :endDate', { endDate });
      }

      const balanceHistory = await balanceHistoryQuery.getMany();

      // Query equity history from all accounts
      const equityHistoryQuery = this.equityHistoryRepository
        .createQueryBuilder('history')
        .where('history.metaTraderAccountId IN (:...accountIds)', { accountIds })
        .orderBy('history.time', 'ASC');

      if (startDate) {
        equityHistoryQuery.andWhere('history.time >= :startDate', { startDate });
      }
      if (endDate) {
        equityHistoryQuery.andWhere('history.time <= :endDate', { endDate });
      }

      const equityHistory = await equityHistoryQuery.getMany();

      // Merge balance and equity history by timestamp
      // Aggregate both balance and equity by summing values at matching timestamps
      const balanceMap = new Map<string, number>();
      const equityMap = new Map<string, number>();
      
      balanceHistory.forEach((point) => {
        const key = point.time.toISOString();
        const existing = balanceMap.get(key) ?? 0;
        balanceMap.set(key, existing + Number(point.balance));
      });

      equityHistory.forEach((point) => {
        const key = point.time.toISOString();
        const existing = equityMap.get(key) ?? 0;
        equityMap.set(key, existing + Number(point.equity));
      });

      // Collect all unique timestamps
      const allTimestamps = new Set<string>();
      balanceHistory.forEach(point => allTimestamps.add(point.time.toISOString()));
      equityHistory.forEach(point => allTimestamps.add(point.time.toISOString()));

      // Create aggregated history points
      let equityBalanceHistory: EquityBalanceHistoryPointDto[] = Array.from(allTimestamps).map(timestamp => ({
        timestamp: new Date(timestamp),
        balance: balanceMap.has(timestamp) ? balanceMap.get(timestamp)! : null,
        equity: equityMap.has(timestamp) ? equityMap.get(timestamp)! : null,
      }));

      // Sort by timestamp
      equityBalanceHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Apply resolution aggregation if specified
      if (query.historyResolution && query.historyResolution !== HistoryResolution.RAW) {
        equityBalanceHistory = this.aggregateHistory(equityBalanceHistory, query.historyResolution);
      }

      // Apply limit if specified
      if (query.historyLimit && equityBalanceHistory.length > query.historyLimit) {
        // Sample evenly across the dataset
        const step = Math.ceil(equityBalanceHistory.length / query.historyLimit);
        equityBalanceHistory = equityBalanceHistory.filter((_, index) => index % step === 0);
      }

      result.equityBalanceHistory = equityBalanceHistory;
    }

    // Get transaction history from all accounts
    const needsTransactions = shouldInclude(AnalysisSection.TRADE_HISTORY) ||
                               shouldInclude(AnalysisSection.STATS_PER_SYMBOL);
    
    if (needsTransactions) {
      const transactionsQuery = this.transactionHistoryRepository
        .createQueryBuilder('transaction')
        .where('transaction.metaTraderAccountId IN (:...accountIds)', { accountIds })
        .orderBy('transaction.openTime', 'DESC');

      if (startDate) {
        transactionsQuery.andWhere('transaction.openTime >= :startDate', { startDate });
      }
      if (endDate) {
        transactionsQuery.andWhere('transaction.openTime <= :endDate', { endDate });
      }

      let transactions = await transactionsQuery.getMany();

      // Apply symbol filter if specified
      if (query.tradeSymbols?.length) {
        transactions = transactions.filter(tx => 
          tx.symbol && query.tradeSymbols!.includes(tx.symbol.toUpperCase())
        );
      }

      // Apply profit filters
      if (query.onlyProfitableTrades) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) > 0);
      } else if (query.onlyLosingTrades) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) < 0);
      }

      if (query.minProfit !== undefined) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) >= query.minProfit!);
      }

      if (query.maxProfit !== undefined) {
        transactions = transactions.filter(tx => Number(tx.profit ?? 0) <= query.maxProfit!);
      }

      // Calculate stats per symbol if requested
      if (shouldInclude(AnalysisSection.STATS_PER_SYMBOL)) {
        const symbolStatsMap = new Map<string, {
          totalTrades: number;
          winTrades: number;
          lossTrades: number;
          profit: number;
        }>();

        transactions.forEach((tx) => {
          if (!tx.symbol) return;

          const stats = symbolStatsMap.get(tx.symbol) || {
            totalTrades: 0,
            winTrades: 0,
            lossTrades: 0,
            profit: 0,
          };

          stats.totalTrades++;
          const profit = Number(tx.profit ?? 0);
          stats.profit += profit;

          if (profit > 0) {
            stats.winTrades++;
          } else if (profit < 0) {
            stats.lossTrades++;
          }

          symbolStatsMap.set(tx.symbol, stats);
        });

        let statsPerSymbol: SymbolStatsDto[] = Array.from(symbolStatsMap.entries()).map(([symbol, stats]) => {
          const symbolWinrate = stats.totalTrades > 0
            ? Number(((stats.winTrades / stats.totalTrades) * 100).toFixed(2))
            : 0;
          const averageProfit = stats.totalTrades > 0
            ? Number((stats.profit / stats.totalTrades).toFixed(2))
            : 0;

          return {
            symbol,
            totalTrades: stats.totalTrades,
            winTrades: stats.winTrades,
            lossTrades: stats.lossTrades,
            winrate: symbolWinrate,
            profit: Number(stats.profit.toFixed(2)),
            averageProfit,
          };
        });

        // Sort by total trades descending
        statsPerSymbol.sort((a, b) => b.totalTrades - a.totalTrades);

        // Apply top symbols limit if specified
        if (query.topSymbolsLimit && statsPerSymbol.length > query.topSymbolsLimit) {
          statsPerSymbol = statsPerSymbol.slice(0, query.topSymbolsLimit);
        }

        result.statsPerSymbol = statsPerSymbol;
      }

      // Map trade history if requested
      if (shouldInclude(AnalysisSection.TRADE_HISTORY)) {
        // Apply sorting
        if (query.tradeHistorySortBy) {
          transactions = this.sortTransactions(transactions, query.tradeHistorySortBy);
        }

        // Apply limit
        if (query.tradeHistoryLimit && transactions.length > query.tradeHistoryLimit) {
          transactions = transactions.slice(0, query.tradeHistoryLimit);
        }

        const tradeHistory: TradeHistoryDto[] = transactions.map((tx) => ({
          positionId: tx.positionId ?? null,
          orderTicket: tx.orderTicket ?? null,
          type: tx.type ?? null,
          symbol: tx.symbol ?? null,
          volume: tx.volume ? Number(tx.volume) : null,
          openPrice: tx.openPrice ? Number(tx.openPrice) : null,
          closePrice: tx.closePrice ? Number(tx.closePrice) : null,
          openTime: tx.openTime ?? null,
          closeTime: tx.closeTime ?? null,
          profit: tx.profit ? Number(tx.profit) : null,
          commission: tx.commission ? Number(tx.commission) : null,
          swap: tx.swap ? Number(tx.swap) : null,
          stopLoss: tx.stopLoss ? Number(tx.stopLoss) : null,
          takeProfit: tx.takeProfit ? Number(tx.takeProfit) : null,
        }));

        result.tradeHistory = tradeHistory;
      }
    }

    return result;
  }

  /**
   * Helper method to aggregate history by time resolution
   */
  private aggregateHistory(
    history: EquityBalanceHistoryPointDto[],
    resolution: HistoryResolution,
  ): EquityBalanceHistoryPointDto[] {
    if (history.length === 0) return history;

    const grouped = new Map<string, EquityBalanceHistoryPointDto[]>();
    
    history.forEach((point) => {
      let key: string;
      const date = new Date(point.timestamp);
      
      switch (resolution) {
        case HistoryResolution.HOURLY:
          date.setMinutes(0, 0, 0);
          key = date.toISOString();
          break;
        case HistoryResolution.DAILY:
          date.setHours(0, 0, 0, 0);
          key = date.toISOString();
          break;
        case HistoryResolution.WEEKLY:
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          weekStart.setHours(0, 0, 0, 0);
          key = weekStart.toISOString();
          break;
        default:
          key = point.timestamp.toISOString();
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(point);
    });

    // Aggregate each group (use last value for each period)
    const aggregated: EquityBalanceHistoryPointDto[] = [];
    
    for (const [key, points] of grouped.entries()) {
      const lastPoint = points[points.length - 1];
      aggregated.push({
        timestamp: new Date(key),
        balance: lastPoint.balance,
        equity: lastPoint.equity,
      });
    }

    // Sort by timestamp
    return aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Helper method to sort transactions
   */
  private sortTransactions(transactions: any[], sortBy: TradeHistorySortBy): any[] {
    const sorted = [...transactions];
    
    switch (sortBy) {
      case TradeHistorySortBy.OPEN_TIME_DESC:
        return sorted.sort((a, b) => {
          const aTime = a.openTime?.getTime() ?? 0;
          const bTime = b.openTime?.getTime() ?? 0;
          return bTime - aTime;
        });
      case TradeHistorySortBy.OPEN_TIME_ASC:
        return sorted.sort((a, b) => {
          const aTime = a.openTime?.getTime() ?? 0;
          const bTime = b.openTime?.getTime() ?? 0;
          return aTime - bTime;
        });
      case TradeHistorySortBy.CLOSE_TIME_DESC:
        return sorted.sort((a, b) => {
          const aTime = a.closeTime?.getTime() ?? 0;
          const bTime = b.closeTime?.getTime() ?? 0;
          return bTime - aTime;
        });
      case TradeHistorySortBy.CLOSE_TIME_ASC:
        return sorted.sort((a, b) => {
          const aTime = a.closeTime?.getTime() ?? 0;
          const bTime = b.closeTime?.getTime() ?? 0;
          return aTime - bTime;
        });
      case TradeHistorySortBy.PROFIT_DESC:
        return sorted.sort((a, b) => {
          const aProfit = Number(a.profit ?? 0);
          const bProfit = Number(b.profit ?? 0);
          return bProfit - aProfit;
        });
      case TradeHistorySortBy.PROFIT_ASC:
        return sorted.sort((a, b) => {
          const aProfit = Number(a.profit ?? 0);
          const bProfit = Number(b.profit ?? 0);
          return aProfit - bProfit;
        });
      default:
        return sorted;
    }
  }

  /**
   * Calculate prize amount based on rank and prize strategy
   */
  private calculatePrize(rank: number, marathon: Marathon): number {
    const awardsAmount = Number(marathon.awardsAmount ?? 0);
    if (awardsAmount === 0) return 0;

    const strategyType = marathon.prizeStrategyType ?? PrizeStrategyType.WINNER_TAKE_ALL;
    const config = marathon.prizeStrategyConfig;

    if (strategyType === PrizeStrategyType.WINNER_TAKE_ALL) {
      // Winner takes all - only rank 1 gets prize
      return rank === 1 ? awardsAmount : 0;
    }

    if (strategyType === PrizeStrategyType.PERCENTAGE_SPLIT && config?.placements) {
      // Find matching placement for this rank
      const placement = config.placements.find(p => p.position === rank);
      if (placement && placement.percentage !== undefined) {
        return Number((awardsAmount * (placement.percentage / 100)).toFixed(2));
      }
    }

    return 0;
  }

  /**
   * Get dashboard data for a user
   */
  async getUserDashboard(userId: string, isPublic: boolean = false): Promise<DashboardResponseDto> {
    // Check profile visibility if this is a public request
    if (isPublic) {
      const settings = await this.settingsService.getOrCreateSettings(userId);
      if (settings.profileVisibility === ProfileVisibility.PRIVATE) {
        throw new ForbiddenException('This profile is private and cannot be accessed publicly');
      }
    }

    // Get user aggregated analysis with all sections
    const analysis = await this.getUserAggregatedAnalysis(userId, {
      sections: [
        AnalysisSection.PERFORMANCE,
        AnalysisSection.STATS_PER_SYMBOL,
        AnalysisSection.TRADE_HISTORY,
      ],
      tradeHistoryLimit: 1000, // Get more trades for accurate statistics
    });

    // Get all participants with marathons
    const participants = await this.participantRepository.find({
      where: { user: { id: userId }, isActive: true },
      relations: ['marathon', 'metaTraderAccount', 'user', 'user.profile'],
      order: { createdAt: 'DESC' },
    });

    // Get user details if public
    let userDetails: UserDetailsDto | null = null;
    if (isPublic && participants.length > 0) {
      const user = participants[0].user;
      const profile = user.profile;
      if (profile) {
        userDetails = {
          name: profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`.trim()
            : user.email,
          email: user.email,
          about: profile.about ?? null,
          country: profile.nationality ?? null,
          instagramUrl: profile.instagramUrl ?? null,
          twitterUrl: profile.twitterUrl ?? null,
          linkedinUrl: profile.linkedinUrl ?? null,
          telegramUrl: profile.telegramUrl ?? null,
        };
      }
    }

    // Calculate user stats
    const totalMarathons = participants.length;
    
    // Get total withdrawals
    const totalWithdrawalResult = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
      .where('withdrawal.userId = :userId', { userId })
      .getRawOne();
    const totalWithdrawal = Number(totalWithdrawalResult?.total || '0');

    // Calculate marathons won (finished marathons where user rank = 1)
    const finishedParticipants = participants.filter(p => 
      p.marathon && p.marathon.status === MarathonStatus.FINISHED
    );
    
    const snapshots = this.liveAccountDataService.getAllSnapshots();
    let marathonsWon = 0;
    
    for (const participant of finishedParticipants) {
      const marathon = participant.marathon!;
      const leaderboard = await this.leaderboardService.calculateLeaderboard(marathon.id, snapshots);
      const userEntry = leaderboard?.entries.find(e => e.userId === userId);
      if (userEntry && userEntry.rank === 1) {
        marathonsWon++;
      }
    }

    const marathonsWinrate = totalMarathons > 0
      ? Number(((marathonsWon / totalMarathons) * 100).toFixed(2))
      : 0;

    const stats: UserStatsDto = {
      totalWithdrawal: Number(totalWithdrawal.toFixed(2)),
      totalMarathons,
      marathonsWon,
      marathonsWinrate,
    };

    // Calculate trades winrate
    const totalTrades = analysis.totalTrades ?? 0;
    const successfulTrades = analysis.winTrades ?? 0;
    const stoppedTrades = analysis.lossTrades ?? 0;
    const winratePercentage = totalTrades > 0
      ? Number(((successfulTrades / totalTrades) * 100).toFixed(2))
      : 0;

    const tradesWinrate: TradesWinrateDto = {
      total_trades: totalTrades,
      win_trades: successfulTrades,
      loss_trades: stoppedTrades,
      percentage: Number(winratePercentage.toFixed(2)),
    };

    // Calculate currency pairs (top 5 + Other)
    const statsPerSymbol = analysis.statsPerSymbol ?? [];
    const top5Symbols = statsPerSymbol.slice(0, 5);
    const otherSymbols = statsPerSymbol.slice(5);
    const otherTotalTrades = otherSymbols.reduce((sum, s) => sum + s.totalTrades, 0);
    const totalAllTrades = statsPerSymbol.reduce((sum, s) => sum + s.totalTrades, 0);

    const currencyPairsSeries: CurrencyPairSeriesDto[] = [
      ...top5Symbols.map(s => ({
        label: s.symbol,
        value: s.totalTrades,
        percentage: totalAllTrades > 0 ? Number(((s.totalTrades / totalAllTrades) * 100).toFixed(2)) : 0,
      })),
      ...(otherTotalTrades > 0 ? [{
        label: 'Other',
        value: otherTotalTrades,
        percentage: totalAllTrades > 0 ? Number(((otherTotalTrades / totalAllTrades) * 100).toFixed(2)) : 0,
      }] : []),
    ];

    const currencyPairs: CurrencyPairsDto = {
      series: currencyPairsSeries,
    };

    // Currency pairs treemap
    const currencyPairsTreemapByTrades: CurrencyPairTreemapByTradesDto[] = statsPerSymbol.map(s => ({
      x: s.symbol,
      y: s.totalTrades,
    }));

    // Add "Other" if there are more than top symbols
    if (otherTotalTrades > 0) {
      currencyPairsTreemapByTrades.push({
        x: 'Other',
        y: otherTotalTrades,
      });
    }

    // Calculate performance per symbol (profit percentage based on average profit)
    const currencyPairsTreemapPerformance: CurrencyPairTreemapPerformanceDto[] = statsPerSymbol.map(s => {
      const avgProfit = s.averageProfit ?? 0;
      // Performance as average profit per trade (simplified metric)
      return {
        label: s.symbol,
        performance: Number(avgProfit.toFixed(2)),
      };
    });

    if (otherTotalTrades > 0) {
      const otherTotalProfit = otherSymbols.reduce((sum, s) => sum + (s.profit ?? 0), 0);
      const otherAvgProfit = otherTotalTrades > 0 ? otherTotalProfit / otherTotalTrades : 0;
      currencyPairsTreemapPerformance.push({
        label: 'Other',
        performance: Number(otherAvgProfit.toFixed(2)),
      });
    }

    const currencyPairsTreemap: CurrencyPairsTreemapDto = {
      byTrades: currencyPairsTreemapByTrades,
      performance: currencyPairsTreemapPerformance,
    };

    // Currency pairs winrate
    const top6Symbols = statsPerSymbol.slice(0, 6);
    const categories = top6Symbols.map(s => s.symbol);
    if (otherTotalTrades > 0 && top6Symbols.length < 6) {
      categories.push('Other');
    }

    const winData: number[] = top6Symbols.map(s => s.winrate);
    if (otherTotalTrades > 0 && top6Symbols.length < 6) {
      const otherWinTrades = otherSymbols.reduce((sum, s) => sum + s.winTrades, 0);
      const otherWinrate = otherTotalTrades > 0 ? Number(((otherWinTrades / otherTotalTrades) * 100).toFixed(2)) : 0;
      winData.push(otherWinrate);
    }

    const lossData: number[] = top6Symbols.map(s => {
      const lossTrades = s.lossTrades;
      return s.totalTrades > 0 ? Number(((lossTrades / s.totalTrades) * 100).toFixed(2)) : 0;
    });
    if (otherTotalTrades > 0 && top6Symbols.length < 6) {
      const otherLossTrades = otherSymbols.reduce((sum, s) => sum + s.lossTrades, 0);
      const otherLossrate = otherTotalTrades > 0 ? Number(((otherLossTrades / otherTotalTrades) * 100).toFixed(2)) : 0;
      lossData.push(otherLossrate);
    }

    const currencyPairsWinrate: CurrencyPairsWinrateDto = {
      categories,
      series: [
        { name: 'Win', data: winData },
        { name: 'Loss', data: lossData },
      ],
    };

    // Trades short/long
    const tradeHistory = analysis.tradeHistory ?? [];
    const longTrades = tradeHistory.filter(t => t.type?.toUpperCase() === 'BUY' || t.type?.toUpperCase() === 'LONG').length;
    const shortTrades = tradeHistory.filter(t => t.type?.toUpperCase() === 'SELL' || t.type?.toUpperCase() === 'SHORT').length;
    const totalLongShort = longTrades + shortTrades;
    const longPercentage = totalLongShort > 0 ? Number(((longTrades / totalLongShort) * 100).toFixed(2)) : 0;
    const shortPercentage = totalLongShort > 0 ? Number(((shortTrades / totalLongShort) * 100).toFixed(2)) : 0;

    const tradesShortLong: TradesShortLongDto = {
      series: [
        {
          label: `Long (${longPercentage.toFixed(2)}%)`,
          value: longTrades,
          percentage: Number(longPercentage.toFixed(2)),
        },
        {
          label: `Short (${shortPercentage.toFixed(2)}%)`,
          value: shortTrades,
          percentage: Number(shortPercentage.toFixed(2)),
        },
      ],
    };

    // Get best marathons (finished marathons sorted by rank)
    // Note: finishedParticipants already calculated above, but we need to recalculate for best marathons
    const finishedParticipantsForBest = participants.filter(p => 
      p.marathon && p.marathon.status === MarathonStatus.FINISHED
    );
    const bestMarathonsPromises = finishedParticipantsForBest.map(async (participant) => {
      const marathon = participant.marathon!;
      const leaderboard = await this.leaderboardService.calculateLeaderboard(marathon.id, snapshots);
      const userEntry = leaderboard?.entries.find(e => e.userId === userId);
      const rank = userEntry?.rank ?? 0;
      const profitPercentage = userEntry?.profitPercentage ?? 0;
      const prize = this.calculatePrize(rank, marathon);

      return {
        id: marathon.id,
        profitPercentage: Number(Number(profitPercentage).toFixed(2)),
        rank,
        prize: Number(Number(prize).toFixed(2)),
        date: marathon.endDate.toISOString().split('T')[0],
      };
    });

    const bestMarathonsData = await Promise.all(bestMarathonsPromises);
    const bestMarathons: BestMarathonDto[] = bestMarathonsData
      .filter(m => m.rank > 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5);

    // Get last marathon (ongoing first, otherwise last participated)
    let lastMarathon: LastMarathonDto | null = null;
    
    // First try to get ongoing marathon
    const ongoingParticipants = participants.filter(p => 
      p.marathon && p.marathon.status === MarathonStatus.ONGOING
    );

    // If no ongoing marathon, get the last participated marathon (already sorted by createdAt DESC)
    const lastParticipant = ongoingParticipants.length > 0 
      ? ongoingParticipants[0] 
      : participants.length > 0 
        ? participants[0] 
        : null;

    if (lastParticipant && lastParticipant.marathon) {
      const marathon = lastParticipant.marathon;
      const isOngoing = marathon.status === MarathonStatus.ONGOING;
      const leaderboard = await this.leaderboardService.calculateLeaderboard(marathon.id, snapshots);
      const userEntry = leaderboard?.entries.find(e => e.userId === userId);
      const currentRank = userEntry?.rank ?? 0;
      const profitPercentage = userEntry?.profitPercentage ?? 0;
      const prize = this.calculatePrize(currentRank, marathon);

      lastMarathon = {
        id: marathon.id,
        name: marathon.name,
        isLive: isOngoing,
        startDate: marathon.startDate.toISOString(),
        endDate: marathon.endDate.toISOString(),
        currentRank,
        totalParticipants: leaderboard?.totalParticipants ?? 0,
        profitPercentage: Number(Number(profitPercentage).toFixed(2)),
        prize: Number(Number(prize).toFixed(2)),
      };
    }

    // Get last trades (most recent 5) - tradeHistory is already sorted by openTime DESC
    // Use actual database fields, don't calculate status
    const lastTrades: LastTradeDto[] = tradeHistory
      .slice(0, 5)
      .map(t => ({
        positionId: t.positionId ?? null,
        orderTicket: t.orderTicket ?? null,
        type: t.type ?? null,
        symbol: t.symbol ?? null,
        volume: t.volume ? Number(Number(t.volume).toFixed(2)) : null,
        openPrice: t.openPrice ? Number(Number(t.openPrice).toFixed(5)) : null,
        closePrice: t.closePrice ? Number(Number(t.closePrice).toFixed(5)) : null,
        openTime: t.openTime ?? null,
        closeTime: t.closeTime ?? null,
        profit: t.profit ? Number(Number(t.profit).toFixed(2)) : null,
        commission: t.commission ? Number(Number(t.commission).toFixed(2)) : null,
        swap: t.swap ? Number(Number(t.swap).toFixed(2)) : null,
        stopLoss: t.stopLoss ? Number(Number(t.stopLoss).toFixed(5)) : null,
        takeProfit: t.takeProfit ? Number(Number(t.takeProfit).toFixed(5)) : null,
      }));

    return {
      tradesWinrate,
      currency_pairs: currencyPairs,
      currency_pairs_treemap: currencyPairsTreemap,
      currency_pairs_winrate: currencyPairsWinrate,
      trades_short_long: tradesShortLong,
      best_marathons: bestMarathons,
      last_marathon: lastMarathon,
      last_trades: lastTrades,
      user: userDetails,
      stats,
    };
  }

  /**
   * Get participant by ID in a specific marathon (helper method)
   */
  async getParticipantByIdInMarathon(marathonId: string, participantId: string) {
    const participant = await this.participantRepository.findOne({
      where: { 
        id: participantId,
        marathon: { id: marathonId },
        isActive: true,
      },
      relations: ['user', 'user.profile', 'marathon', 'metaTraderAccount'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${participantId} not found in this marathon`);
    }

    return participant;
  }

  /**
   * Get participant by user ID in a specific marathon (helper method)
   */
  async getParticipantByUserInMarathon(marathonId: string, userId: string) {
    const participant = await this.participantRepository.findOne({
      where: { 
        user: { id: userId },
        marathon: { id: marathonId },
        isActive: true,
      },
      relations: ['user', 'user.profile', 'marathon'],
    });

    if (!participant) {
      throw new NotFoundException(`You are not a participant in this marathon`);
    }

    return participant;
  }

  /**
   * Get live participant analysis data in live.json format
   */
  async getParticipantLiveAnalysis(
    marathonId: string,
    participantId: string,
    isPublic: boolean = false,
  ): Promise<LiveResponseDto> {
    // Get marathon
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    // Get participant
    const participant = await this.getParticipantByIdInMarathon(marathonId, participantId);

    // Check profile visibility if this is a public request
    if (isPublic) {
      const userId = participant.user.id;
      const settings = await this.settingsService.getOrCreateSettings(userId);
      if (settings.profileVisibility === ProfileVisibility.PRIVATE) {
        throw new ForbiddenException('This profile is private and cannot be accessed publicly');
      }
    }

    if (!participant.metaTraderAccount?.id) {
      throw new NotFoundException(`Participant does not have a MetaTrader account`);
    }

    const accountId = participant.metaTraderAccount.id;
    const accountLogin = participant.metaTraderAccount.login;
    const userId = participant.user.id;

    // Get leaderboard data
    const snapshots = this.liveAccountDataService.getAllSnapshots();
    const leaderboard = await this.leaderboardService.calculateLeaderboard(marathonId, snapshots);
    const userEntry = leaderboard?.entries.find(e => e.userId === userId);
    const currentRank = userEntry?.rank ?? 0;
    const profitPercentage = userEntry?.profitPercentage ?? 0;
    const prize = this.calculatePrize(currentRank, marathon);

    // Get performance data
    const performance = await this.performanceRepository.findOne({
      where: { metaTraderAccountId: accountId },
    });

    const totalTrades = performance?.totalTrades ?? 0;
    const successfulTrades = performance?.profitTrades ?? 0;
    const stoppedTrades = performance?.lossTrades ?? 0;
    const winRate = totalTrades > 0 
      ? Math.round((successfulTrades / totalTrades) * 100)
      : 0;

    // Get live account data
    const liveSnapshot = this.liveAccountDataService.getSnapshot(accountLogin);
    const equity = liveSnapshot?.equity ?? 0;
    const balance = liveSnapshot?.balance ?? 0;
    const currentProfit = liveSnapshot?.profit ?? 0;

    // Calculate total profit/loss (from performance or current balance - initial balance)
    const totalProfitLoss = performance?.totalNetProfit 
      ? Number(performance.totalNetProfit)
      : balance - 10000; // Assuming 10000 is initial balance, adjust if needed

    // Calculate average trade profit/loss
    const averageTradeProfitLoss = totalTrades > 0
      ? Number((totalProfitLoss / totalTrades).toFixed(2))
      : 0;

    // Get best and worst trades
    const bestTrade = performance?.largestProfitTrade 
      ? Number(performance.largestProfitTrade)
      : 0;
    const worstTrade = performance?.largestLossTrade 
      ? Number(performance.largestLossTrade)
      : 0;

    // Calculate days active (from marathon start to now)
    const now = new Date();
    const daysActive = Math.max(1, Math.ceil((now.getTime() - marathon.startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Build marathon data
    const marathonData: MarathonLiveDto = {
      id: marathon.id,
      name: marathon.name,
      isLive: marathon.status === MarathonStatus.ONGOING,
      startDate: marathon.startDate.toISOString(),
      endDate: marathon.endDate.toISOString(),
      currentRank,
      totalParticipants: leaderboard?.totalParticipants ?? 0,
      profitPercentage: Number(profitPercentage).toFixed(2),
      prize: prize > 0 ? Number(prize.toFixed(2)) : null,
      score: null, // Not implemented yet
      totalTrades,
      successfulTrades,
      stoppedTrades,
      winRate,
      equity: Number(equity.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      totalProfitLoss: Number(totalProfitLoss.toFixed(2)),
      averageTradeProfitLoss,
      bestTrade: Number(bestTrade.toFixed(2)),
      worstTrade: Number(worstTrade.toFixed(2)),
      daysActive,
    };

    // Build risk metrics
    const floatingRiskPercent = equity > 0 && currentProfit !== null
      ? Number(((Math.abs(currentProfit) / equity) * 100).toFixed(2))
      : 0;
    const drawdownPercent = performance?.balanceDrawdownRelativePercent 
      ? Number(performance.balanceDrawdownRelativePercent)
      : 0;

    // Calculate maximum risk float and drawdown from history
    let riskFloatMax = 100; // Default fallback
    let drawdownMax = 100; // Default fallback

    try {
      // Get equity and balance history for the marathon period
      const balanceHistory = await this.tokyoDataService.getBalanceHistory(
        accountId,
        marathon.startDate,
        marathon.endDate || now,
      );
      const equityHistory = await this.tokyoDataService.getEquityHistory(
        accountId,
        marathon.startDate,
        marathon.endDate || now,
      );

      // Calculate maximum risk float from history
      // Risk float = abs(equity - balance) / equity * 100
      if (equityHistory.length > 0 && balanceHistory.length > 0) {
        // Create a map of balance by time for quick lookup
        const balanceMap = new Map<string, number>();
        balanceHistory.forEach((point) => {
          const key = point.time.toISOString();
          balanceMap.set(key, Number(point.balance));
        });

        let maxRiskFloat = 0;
        equityHistory.forEach((point) => {
          const equityValue = Number(point.equity);
          if (equityValue > 0) {
            // Find closest balance value (same timestamp or closest)
            const timeKey = point.time.toISOString();
            let balanceValue = balanceMap.get(timeKey);
            
            // If no exact match, find closest balance
            if (balanceValue === undefined) {
              // Find the balance at or before this equity point
              const closestBalance = balanceHistory
                .filter(b => b.time <= point.time)
                .sort((a, b) => b.time.getTime() - a.time.getTime())[0];
              balanceValue = closestBalance ? Number(closestBalance.balance) : equityValue;
            }

            const floatingProfit = equityValue - balanceValue;
            const riskFloatPercent = (Math.abs(floatingProfit) / equityValue) * 100;
            if (riskFloatPercent > maxRiskFloat) {
              maxRiskFloat = riskFloatPercent;
            }
          }
        });

        if (maxRiskFloat > 0) {
          riskFloatMax = Number(maxRiskFloat.toFixed(2));
        }
      }

      // Calculate maximum drawdown from history
      // Use performance table value if available, otherwise calculate from balance history
      if (performance?.balanceDrawdownMaximal) {
        // Get initial balance to calculate percentage
        const initialBalance = balanceHistory.length > 0 
          ? Number(balanceHistory[0].balance)
          : balance;
        
        if (initialBalance > 0) {
          const maxDrawdownPercent = (Number(performance.balanceDrawdownMaximal) / initialBalance) * 100;
          drawdownMax = Number(maxDrawdownPercent.toFixed(2));
        }
      } else if (balanceHistory.length > 0) {
        // Calculate maximum drawdown from balance history
        const initialBalance = Number(balanceHistory[0].balance);
        if (initialBalance > 0) {
          let maxDrawdown = 0;
          let peakBalance = initialBalance;

          balanceHistory.forEach((point) => {
            const balanceValue = Number(point.balance);
            if (balanceValue > peakBalance) {
              peakBalance = balanceValue;
            }
            const drawdown = peakBalance - balanceValue;
            const drawdownPercent = (drawdown / peakBalance) * 100;
            if (drawdownPercent > maxDrawdown) {
              maxDrawdown = drawdownPercent;
            }
          });

          if (maxDrawdown > 0) {
            drawdownMax = Number(maxDrawdown.toFixed(2));
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to calculate historical risk metrics: ${error.message}`);
      // Keep default values (100) if calculation fails
    }

    const riskMetrics: RiskMetricsDto = {
      riskFloat: floatingRiskPercent,
      riskFloatMax,
      drawdown: drawdownPercent,
      drawdownMax,
    };

    // Get trade history
    const transactions = await this.tokyoDataService.getTransactionHistoryByDateRange(
      accountId,
      marathon.startDate,
      marathon.endDate || now,
    );

    // Sort by openTime DESC (most recent first)
    transactions.sort((a, b) => {
      const aTime = a.openTime?.getTime() ?? 0;
      const bTime = b.openTime?.getTime() ?? 0;
      return bTime - aTime;
    });

    // Return actual database fields without transformation
    const tradeHistory: TradeHistoryItemDto[] = transactions.map((tx) => ({
      id: tx.id ?? null,
      positionId: tx.positionId ?? null,
      orderTicket: tx.orderTicket ?? null,
      openTime: tx.openTime ?? null,
      closeTime: tx.closeTime ?? null,
      type: tx.type ?? null,
      volume: tx.volume ? Number(Number(tx.volume).toFixed(5)) : null,
      symbol: tx.symbol ?? null,
      openPrice: tx.openPrice ? Number(Number(tx.openPrice).toFixed(5)) : null,
      closePrice: tx.closePrice ? Number(Number(tx.closePrice).toFixed(5)) : null,
      stopLoss: tx.stopLoss ? Number(Number(tx.stopLoss).toFixed(5)) : null,
      takeProfit: tx.takeProfit ? Number(Number(tx.takeProfit).toFixed(5)) : null,
      profit: tx.profit ? Number(Number(tx.profit).toFixed(2)) : null,
      commission: tx.commission ? Number(Number(tx.commission).toFixed(2)) : null,
      swap: tx.swap ? Number(Number(tx.swap).toFixed(2)) : null,
      risk: tx.risk ? Number(Number(tx.risk).toFixed(2)) : null,
      riskPercent: tx.riskPercent ? Number(Number(tx.riskPercent).toFixed(2)) : null,
      balanceAtOpen: tx.balanceAtOpen ? Number(Number(tx.balanceAtOpen).toFixed(2)) : null,
      comment: tx.comment ?? null,
    }));

    // Calculate currency pairs statistics
    const symbolStatsMap = new Map<string, { totalTrades: number; profit: number }>();
    transactions.forEach((tx) => {
      if (!tx.symbol) return;
      const stats = symbolStatsMap.get(tx.symbol) || { totalTrades: 0, profit: 0 };
      stats.totalTrades++;
      stats.profit += Number(tx.profit ?? 0);
      symbolStatsMap.set(tx.symbol, stats);
    });

    const statsPerSymbol = Array.from(symbolStatsMap.entries())
      .map(([symbol, stats]) => ({
        symbol,
        totalTrades: stats.totalTrades,
        profit: stats.profit,
      }))
      .sort((a, b) => b.totalTrades - a.totalTrades);

    const totalAllTrades = statsPerSymbol.reduce((sum, s) => sum + s.totalTrades, 0);
    const top5Symbols = statsPerSymbol.slice(0, 5);
    const otherSymbols = statsPerSymbol.slice(5);
    const otherTotalTrades = otherSymbols.reduce((sum, s) => sum + s.totalTrades, 0);

    const currencyPairsSeries = [
      ...top5Symbols.map(s => ({
        label: s.symbol,
        value: s.totalTrades,
        percentage: totalAllTrades > 0 ? Number(((s.totalTrades / totalAllTrades) * 100).toFixed(2)) : 0,
      })),
      ...(otherTotalTrades > 0 ? [{
        label: 'Other',
        value: otherTotalTrades,
        percentage: totalAllTrades > 0 ? Number(((otherTotalTrades / totalAllTrades) * 100).toFixed(2)) : 0,
      }] : []),
    ];

    const currencyPairs: LiveCurrencyPairsDto = {
      series: currencyPairsSeries,
    };

    // Calculate trades short/long
    const longTrades = transactions.filter(t => t.type?.toUpperCase() === 'BUY').length;
    const shortTrades = transactions.filter(t => t.type?.toUpperCase() === 'SELL').length;

    const tradesShortLong: LiveTradesShortLongDto = {
      series: [
        {
          label: 'Long',
          value: longTrades,
        },
        {
          label: 'Short',
          value: shortTrades,
        },
      ],
    };

    // Get equity and balance history
    const balanceHistory = await this.tokyoDataService.getBalanceHistory(accountId, marathon.startDate, marathon.endDate || now);
    const equityHistory = await this.tokyoDataService.getEquityHistory(accountId, marathon.startDate, marathon.endDate || now);

    // Merge and format for chart
    const equityMap = new Map<string, number>();
    equityHistory.forEach((point) => {
      const key = point.time.toISOString();
      equityMap.set(key, Number(point.equity));
    });

    const categories: string[] = [];
    const equityData: number[] = [];
    const balanceData: number[] = [];

    balanceHistory.forEach((point) => {
      const key = point.time.toISOString();
      categories.push(key);
      balanceData.push(Number(point.balance));
      equityData.push(equityMap.has(key) ? equityMap.get(key)! : Number(point.balance));
    });

    const equityBalance: EquityBalanceDto = {
      categories,
      series: [
        {
          name: 'Equity',
          data: equityData,
          group: 'apexcharts-axis-0',
        },
        {
          name: 'Balance',
          data: balanceData,
          group: 'apexcharts-axis-0',
        },
      ],
    };

    // Get user details if public
    let user: LiveUserDetailsDto | null = null;
    if (isPublic && participant.user.profile) {
      const profile = participant.user.profile;
      user = {
        name: profile.firstName && profile.lastName
          ? `${profile.firstName} ${profile.lastName}`.trim()
          : participant.user.email,
        email: participant.user.email,
        about: profile.about ?? null,
        country: profile.nationality ?? null,
        instagramUrl: profile.instagramUrl ?? null,
        twitterUrl: profile.twitterUrl ?? null,
        linkedinUrl: profile.linkedinUrl ?? null,
        telegramUrl: profile.telegramUrl ?? null,
      };
    }

    return {
      marathon: marathonData,
      riskMetrics,
      tradeHistory,
      currencyPairs,
      tradesShortLong,
      equityBalance,
      rules: marathon.rules as any, // MarathonRules type is compatible with MarathonRulesDto
      user: user ?? undefined,
    };
  }
} 