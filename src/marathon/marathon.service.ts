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
import { MarathonLeaderboardResponseDto, MarathonLeaderboardEntryDto, MarathonPnLHistoryResponseDto, ParticipantPnLHistoryDto, PnLHistoryPointDto, MarathonTransactionHistoryResponseDto, ParticipantTransactionHistoryDto, TransactionDto, ParticipantAnalysisDto, PerformanceMetricsDto, DrawdownMetricsDto, FloatingRiskDto, EquityBalanceHistoryPointDto, SymbolStatsDto, TradeHistoryDto } from './dto/marathon-response.dto';
import { LiveAccountDataService } from './live-account-data.service';
import { TokyoDataService } from '../tokyo-data/tokyo-data.service';
import { ParticipantAnalysisQueryDto, AnalysisSection, TradeHistorySortBy, HistoryResolution } from './dto/participant-analysis-query.dto';

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
    private readonly liveAccountDataService: LiveAccountDataService,
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
   * Get transaction history for all participants in a marathon
   */
  async getMarathonTransactionHistory(
    marathonId: string,
    from?: Date,
    to?: Date,
    limit?: number,
  ): Promise<MarathonTransactionHistoryResponseDto> {
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

    const participantsHistory: ParticipantTransactionHistoryDto[] = [];

    for (const participant of participants) {
      if (!participant.metaTraderAccount?.id) {
        continue;
      }

      // Get transaction history for this account
      const transactions = await this.tokyoDataService.getTransactionHistoryByDateRange(
        participant.metaTraderAccount.id,
        startDate,
        endDate,
        limit,
      );

      // Map transactions to DTO (only include requested fields)
      const transactionDtos: TransactionDto[] = transactions.map((tx) => ({
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
        totalTransactions: transactionDtos.length,
        transactions: transactionDtos,
      });
    }

    return {
      marathonId: marathon.id,
      marathonName: marathon.name,
      participants: participantsHistory,
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
} 