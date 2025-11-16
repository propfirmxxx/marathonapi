import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TokyoAccountData } from './entities/tokyo-account-data.entity';
import { TokyoTransactionHistory } from './entities/tokyo-transaction-history.entity';
import { TokyoPerformance } from './entities/tokyo-performance.entity';
import { TokyoBalanceHistory } from './entities/tokyo-balance-history.entity';
import { TokyoEquityHistory } from './entities/tokyo-equity-history.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { AccountSnapshot } from '../marathon/live-account-data.service';

@Injectable()
export class TokyoDataService {
  private readonly logger = new Logger(TokyoDataService.name);

  constructor(
    @InjectRepository(TokyoAccountData)
    private readonly accountDataRepository: Repository<TokyoAccountData>,
    @InjectRepository(TokyoTransactionHistory)
    private readonly transactionHistoryRepository: Repository<TokyoTransactionHistory>,
    @InjectRepository(TokyoPerformance)
    private readonly performanceRepository: Repository<TokyoPerformance>,
    @InjectRepository(TokyoBalanceHistory)
    private readonly balanceHistoryRepository: Repository<TokyoBalanceHistory>,
    @InjectRepository(TokyoEquityHistory)
    private readonly equityHistoryRepository: Repository<TokyoEquityHistory>,
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Update account data from RabbitMQ snapshot
   */
  async updateFromRabbitMQ(snapshot: AccountSnapshot): Promise<void> {
    try {
      const account = await this.metaTraderAccountRepository.findOne({
        where: { login: snapshot.login },
      });

      if (!account) {
        this.logger.warn(`Account not found for login: ${snapshot.login}`);
        return;
      }

      await this.updateAccountData(account.id, snapshot);
    } catch (error) {
      this.logger.error(
        `Failed to update account data from RabbitMQ for login ${snapshot.login}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update account data from Tokyo API response
   */
  async updateFromTokyoAPI(
    accountLogin: string,
    accountData: any,
  ): Promise<void> {
    try {
      const account = await this.metaTraderAccountRepository.findOne({
        where: { login: accountLogin },
      });

      if (!account) {
        this.logger.warn(`Account not found for login: ${accountLogin}`);
        return;
      }

      // Update account data snapshot
      // Update if we have balance/equity OR if we have positions/orders to update
      if (
        accountData.balance !== undefined ||
        accountData.equity !== undefined ||
        accountData.positions !== undefined ||
        accountData.orders !== undefined
      ) {
        await this.updateAccountData(account.id, {
          login: accountLogin,
          balance: accountData.balance,
          equity: accountData.equity,
          profit: accountData.profit,
          margin: accountData.margin,
          freeMargin: accountData.freeMargin,
          currency: accountData.currency,
          leverage: accountData.leverage,
          positions: accountData.positions,
          orders: accountData.orders,
          updatedAt: new Date(),
          raw: accountData,
        });
      }

      // Update performance if available
      if (accountData.total_trades !== undefined) {
        await this.updatePerformance(account.id, accountData);
      }

      // Update transaction history if available
      if (accountData.trades && Array.isArray(accountData.trades)) {
        await this.updateTransactionHistory(account.id, accountData.trades);
      }

      // Update balance history if available
      if (accountData.balance_history && Array.isArray(accountData.balance_history)) {
        await this.updateBalanceHistory(account.id, accountData.balance_history);
      }

      // Update equity history if available
      if (accountData.equity_history && Array.isArray(accountData.equity_history)) {
        await this.updateEquityHistory(account.id, accountData.equity_history);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update account data from Tokyo API for login ${accountLogin}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update account data snapshot
   */
  private async updateAccountData(
    accountId: string,
    snapshot: AccountSnapshot | Partial<AccountSnapshot>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(TokyoAccountData, {
        where: { metaTraderAccountId: accountId },
      });

      const accountData = existing || new TokyoAccountData();
      accountData.metaTraderAccountId = accountId;
      accountData.balance = snapshot.balance ?? accountData.balance;
      accountData.equity = snapshot.equity ?? accountData.equity;
      accountData.profit = snapshot.profit ?? accountData.profit;
      accountData.margin = snapshot.margin ?? accountData.margin;
      accountData.freeMargin = snapshot.freeMargin ?? accountData.freeMargin;
      accountData.currency = snapshot.currency ?? accountData.currency;
      accountData.leverage = snapshot.leverage ?? accountData.leverage;
      accountData.positions = snapshot.positions ?? accountData.positions;
      accountData.orders = snapshot.orders ?? accountData.orders;
      accountData.rawData = snapshot.raw ?? accountData.rawData;
      accountData.dataTimestamp = snapshot.updatedAt ?? new Date();

      await queryRunner.manager.save(TokyoAccountData, accountData);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update performance metrics
   */
  private async updatePerformance(
    accountId: string,
    performanceData: any,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let performance = await queryRunner.manager.findOne(TokyoPerformance, {
        where: { metaTraderAccountId: accountId },
      });

      if (!performance) {
        performance = new TokyoPerformance();
        performance.metaTraderAccountId = accountId;
      }

      // Update all performance fields
      performance.balance = performanceData.balance ?? performance.balance;
      performance.equity = performanceData.equity ?? performance.equity;
      performance.profit = performanceData.profit ?? performance.profit;
      performance.margin = performanceData.margin ?? performance.margin;
      performance.freeMargin = performanceData.free_margin ?? performance.freeMargin;
      performance.marginLevel = performanceData.margin_level ?? performance.marginLevel;
      performance.creditFacility = performanceData.credit_facility ?? performance.creditFacility;
      performance.totalNetProfit = performanceData.total_net_profit ?? performance.totalNetProfit;
      performance.grossProfit = performanceData.gross_profit ?? performance.grossProfit;
      performance.grossLoss = performanceData.gross_loss ?? performance.grossLoss;
      performance.profitFactor = performanceData.profit_factor ?? performance.profitFactor;
      performance.expectedPayoff = performanceData.expected_payoff ?? performance.expectedPayoff;
      performance.recoveryFactor = performanceData.recovery_factor ?? performance.recoveryFactor;
      performance.sharpeRatio = performanceData.sharpe_ratio ?? performance.sharpeRatio;
      performance.balanceDrawdownAbsolute =
        performanceData.balance_drawdown_absolute ?? performance.balanceDrawdownAbsolute;
      performance.balanceDrawdownMaximal =
        performanceData.balance_drawdown_maximal ?? performance.balanceDrawdownMaximal;
      performance.balanceDrawdownRelativePercent =
        performanceData.balance_drawdown_relative_percent ??
        performance.balanceDrawdownRelativePercent;
      performance.totalTrades = performanceData.total_trades ?? performance.totalTrades;
      performance.profitTrades = performanceData.profit_trades ?? performance.profitTrades;
      performance.lossTrades = performanceData.loss_trades ?? performance.lossTrades;
      performance.largestProfitTrade =
        performanceData.largest_profit_trade ?? performance.largestProfitTrade;
      performance.largestLossTrade =
        performanceData.largest_loss_trade ?? performance.largestLossTrade;
      performance.averageProfitTrade =
        performanceData.average_profit_trade ?? performance.averageProfitTrade;
      performance.averageLossTrade =
        performanceData.average_loss_trade ?? performance.averageLossTrade;
      performance.maxConsecutiveWins =
        performanceData.max_consecutive_wins ?? performance.maxConsecutiveWins;
      performance.maxConsecutiveWinsProfit =
        performanceData.max_consecutive_wins_profit ?? performance.maxConsecutiveWinsProfit;
      performance.maxConsecutiveLosses =
        performanceData.max_consecutive_losses ?? performance.maxConsecutiveLosses;
      performance.maxConsecutiveLossesLoss =
        performanceData.max_consecutive_losses_loss ?? performance.maxConsecutiveLossesLoss;
      performance.averageConsecutiveWins =
        performanceData.average_consecutive_wins ?? performance.averageConsecutiveWins;
      performance.averageConsecutiveLosses =
        performanceData.average_consecutive_losses ?? performance.averageConsecutiveLosses;
      performance.rawData = performanceData;
      performance.dataTimestamp = new Date();

      await queryRunner.manager.save(TokyoPerformance, performance);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update transaction history
   */
  private async updateTransactionHistory(
    accountId: string,
    trades: any[],
  ): Promise<void> {
    if (!trades || trades.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const trade of trades) {
        // Check if transaction already exists
        const existing = await queryRunner.manager.findOne(
          TokyoTransactionHistory,
          {
            where: {
              metaTraderAccountId: accountId,
              positionId: trade.position_id || trade.order_ticket,
            },
          },
        );

        if (existing) {
          continue; // Skip if already exists
        }

        const transaction = new TokyoTransactionHistory();
        transaction.metaTraderAccountId = accountId;
        transaction.positionId = trade.position_id;
        transaction.orderTicket = trade.order_ticket;
        transaction.openTime = trade.open_time
          ? new Date(trade.open_time * 1000)
          : null;
        transaction.closeTime = trade.close_time
          ? new Date(trade.close_time * 1000)
          : null;
        transaction.type = trade.type;
        transaction.volume = trade.volume;
        transaction.symbol = trade.symbol;
        transaction.openPrice = trade.open_price;
        transaction.closePrice = trade.close_price;
        transaction.stopLoss = trade.stop_loss;
        transaction.takeProfit = trade.take_profit;
        transaction.profit = trade.profit;
        transaction.commission = trade.commission;
        transaction.swap = trade.swap;
        transaction.risk = trade.risk;
        transaction.riskPercent = trade.risk_percent;
        transaction.balanceAtOpen = trade.balance_at_open;
        transaction.comment = trade.comment;
        transaction.rawData = trade;

        await queryRunner.manager.save(TokyoTransactionHistory, transaction);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update balance history
   */
  private async updateBalanceHistory(
    accountId: string,
    balanceEvents: any[],
  ): Promise<void> {
    if (!balanceEvents || balanceEvents.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const event of balanceEvents) {
        // Check if event already exists
        const existing = await queryRunner.manager.findOne(
          TokyoBalanceHistory,
          {
            where: {
              metaTraderAccountId: accountId,
              ticket: event.ticket,
              time: new Date(event.time * 1000),
            },
          },
        );

        if (existing) {
          continue; // Skip if already exists
        }

        const balanceHistory = new TokyoBalanceHistory();
        balanceHistory.metaTraderAccountId = accountId;
        balanceHistory.time = new Date(event.time * 1000);
        balanceHistory.ticket = event.ticket;
        balanceHistory.type = event.type;
        balanceHistory.delta = event.delta;
        balanceHistory.balance = event.balance;
        balanceHistory.comment = event.comment;
        balanceHistory.rawData = event;

        await queryRunner.manager.save(TokyoBalanceHistory, balanceHistory);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update equity history
   */
  private async updateEquityHistory(
    accountId: string,
    equityPoints: any[],
  ): Promise<void> {
    if (!equityPoints || equityPoints.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const point of equityPoints) {
        // Check if point already exists
        const existing = await queryRunner.manager.findOne(
          TokyoEquityHistory,
          {
            where: {
              metaTraderAccountId: accountId,
              time: new Date(point.time * 1000),
            },
          },
        );

        if (existing) {
          continue; // Skip if already exists
        }

        const equityHistory = new TokyoEquityHistory();
        equityHistory.metaTraderAccountId = accountId;
        equityHistory.time = new Date(point.time * 1000);
        equityHistory.equity = point.equity;
        equityHistory.rawData = point;

        await queryRunner.manager.save(TokyoEquityHistory, equityHistory);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Fetch and update account data from Tokyo service
   */
  async fetchAndUpdateAccountData(accountLogin: string): Promise<void> {
    // This method will be called from TokyoService
    // It's a placeholder for now - the actual implementation will be in the cron job
    this.logger.log(`Fetch and update requested for account: ${accountLogin}`);
  }

  /**
   * Get latest account data
   */
  async getLatestAccountData(
    accountId: string,
  ): Promise<TokyoAccountData | null> {
    return this.accountDataRepository.findOne({
      where: { metaTraderAccountId: accountId },
      relations: ['metaTraderAccount'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Get performance data
   */
  async getPerformance(accountId: string): Promise<TokyoPerformance | null> {
    return this.performanceRepository.findOne({
      where: { metaTraderAccountId: accountId },
      relations: ['metaTraderAccount'],
    });
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    accountId: string,
    limit: number = 100,
  ): Promise<TokyoTransactionHistory[]> {
    return this.transactionHistoryRepository.find({
      where: { metaTraderAccountId: accountId },
      order: { openTime: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(
    accountId: string,
    from?: Date,
    to?: Date,
  ): Promise<TokyoBalanceHistory[]> {
    const query = this.balanceHistoryRepository
      .createQueryBuilder('history')
      .where('history.metaTraderAccountId = :accountId', { accountId })
      .orderBy('history.time', 'ASC');

    if (from) {
      query.andWhere('history.time >= :from', { from });
    }
    if (to) {
      query.andWhere('history.time <= :to', { to });
    }

    return query.getMany();
  }

  /**
   * Get equity history
   */
  async getEquityHistory(
    accountId: string,
    from?: Date,
    to?: Date,
  ): Promise<TokyoEquityHistory[]> {
    const query = this.equityHistoryRepository
      .createQueryBuilder('history')
      .where('history.metaTraderAccountId = :accountId', { accountId })
      .orderBy('history.time', 'ASC');

    if (from) {
      query.andWhere('history.time >= :from', { from });
    }
    if (to) {
      query.andWhere('history.time <= :to', { to });
    }

    return query.getMany();
  }
}

