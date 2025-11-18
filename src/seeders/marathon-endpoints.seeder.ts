import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoTransactionHistory } from '../tokyo-data/entities/tokyo-transaction-history.entity';
import { TokyoBalanceHistory } from '../tokyo-data/entities/tokyo-balance-history.entity';
import { TokyoEquityHistory } from '../tokyo-data/entities/tokyo-equity-history.entity';
import { TokyoAccountData } from '../tokyo-data/entities/tokyo-account-data.entity';
import { TokyoPerformance } from '../tokyo-data/entities/tokyo-performance.entity';

export class MarathonEndpointsSeeder extends BaseSeeder {
  getName(): string {
    return 'MarathonEndpointsSeeder';
  }

  async run(): Promise<void> {
    const hasParticipants = await this.hasTable('marathon_participants');
    const hasAccounts = await this.hasTable('metatrader_accounts');
    
    if (!hasParticipants || !hasAccounts) {
      this.logger.warn('Required tables do not exist. Skipping marathon endpoints seeding.');
      return;
    }

    this.logger.log('Seeding marathon endpoints data...');

    const manager = this.getManager();
    const participantRepository = manager.getRepository(MarathonParticipant);
    const accountRepository = manager.getRepository(MetaTraderAccount);
    const transactionRepository = manager.getRepository(TokyoTransactionHistory);
    const balanceRepository = manager.getRepository(TokyoBalanceHistory);
    const equityRepository = manager.getRepository(TokyoEquityHistory);
    const accountDataRepository = manager.getRepository(TokyoAccountData);
    const performanceRepository = manager.getRepository(TokyoPerformance);

    // Get all active participants with MetaTrader accounts
    const participants = await participantRepository.find({
      where: { isActive: true },
      relations: ['marathon', 'metaTraderAccount'],
    });

    if (participants.length === 0) {
      this.logger.warn('No active participants found. Skipping marathon endpoints seeding.');
      return;
    }

    this.logger.log(`Found ${participants.length} active participants. Seeding Tokyo data...`);

    // Currency pairs for trading
    const currencyPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURJPY', 'GBPJPY', 'EURGBP', 'XAUUSD', 'BTCUSD'];

    for (const participant of participants) {
      if (!participant.metaTraderAccount) {
        continue;
      }

      const account = participant.metaTraderAccount;
      const marathon = participant.marathon;

      // Determine date range based on marathon dates
      const startDate = marathon.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = marathon.endDate || new Date();
      const now = new Date();

      // Initial balance (typically 10000 for demo accounts)
      const initialBalance = 10000;
      let currentBalance = initialBalance;
      let currentEquity = initialBalance;
      let totalProfit = 0;
      let totalTrades = 0;
      let profitTrades = 0;
      let lossTrades = 0;
      let grossProfit = 0;
      let grossLoss = 0;

      // Generate trades over the marathon period
      const trades: TokyoTransactionHistory[] = [];
      const balanceHistory: TokyoBalanceHistory[] = [];
      const equityHistory: TokyoEquityHistory[] = [];

      // Create initial balance entry
      const initialBalanceEntry = balanceRepository.create({
        metaTraderAccountId: account.id,
        time: startDate,
        ticket: 0,
        type: 2, // Balance
        delta: initialBalance,
        balance: initialBalance,
        comment: 'Initial balance',
      });
      balanceHistory.push(initialBalanceEntry);

      // Create initial equity entry
      const initialEquityEntry = equityRepository.create({
        metaTraderAccountId: account.id,
        time: startDate,
        equity: initialBalance,
      });
      equityHistory.push(initialEquityEntry);

      // Generate trades (between 10-50 trades per participant)
      const numTrades = Math.floor(Math.random() * 40) + 10;
      const timeRange = endDate.getTime() - startDate.getTime();
      
      for (let i = 0; i < numTrades; i++) {
        const tradeTime = new Date(startDate.getTime() + Math.random() * timeRange);
        const symbol = currencyPairs[Math.floor(Math.random() * currencyPairs.length)];
        const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const volume = parseFloat((Math.random() * 0.5 + 0.1).toFixed(2));
        const openPrice = parseFloat((Math.random() * 1000 + 1).toFixed(5));
        const closePrice = parseFloat((openPrice + (Math.random() - 0.5) * 10).toFixed(5));
        const commission = parseFloat((Math.random() * 2).toFixed(2));
        const swap = parseFloat((Math.random() * 0.5 - 0.25).toFixed(2));
        
        // Calculate profit based on price difference
        const priceDiff = type === 'BUY' ? closePrice - openPrice : openPrice - closePrice;
        const profit = parseFloat((priceDiff * volume * 100 - commission - swap).toFixed(2));
        
        const isWin = profit > 0;
        if (isWin) {
          profitTrades++;
          grossProfit += profit;
        } else {
          lossTrades++;
          grossLoss += Math.abs(profit);
        }

        totalTrades++;
        totalProfit += profit;
        currentBalance += profit;
        currentEquity = currentBalance + (Math.random() * 200 - 100); // Equity can vary slightly

        const trade = transactionRepository.create({
          metaTraderAccountId: account.id,
          positionId: i + 1,
          orderTicket: 1000000 + i,
          openTime: tradeTime,
          closeTime: new Date(tradeTime.getTime() + Math.random() * 24 * 60 * 60 * 1000), // Close within 24 hours
          type,
          volume,
          symbol,
          openPrice,
          closePrice,
          stopLoss: parseFloat((openPrice * (type === 'BUY' ? 0.99 : 1.01)).toFixed(5)),
          takeProfit: parseFloat((openPrice * (type === 'BUY' ? 1.01 : 0.99)).toFixed(5)),
          profit,
          commission,
          swap,
          risk: parseFloat((Math.abs(openPrice - (type === 'BUY' ? openPrice * 0.99 : openPrice * 1.01)) * volume * 100).toFixed(2)),
          riskPercent: parseFloat((Math.abs(openPrice - (type === 'BUY' ? openPrice * 0.99 : openPrice * 1.01)) / openPrice * 100).toFixed(2)),
          balanceAtOpen: currentBalance - profit,
          comment: `${type} ${symbol} ${volume} lots`,
        });
        trades.push(trade);

        // Add balance history entry for this trade
        const balanceEntry = balanceRepository.create({
          metaTraderAccountId: account.id,
          time: trade.closeTime || tradeTime,
          ticket: 1000000 + i,
          type: isWin ? 0 : 1, // Buy or Sell deal
          delta: profit,
          balance: currentBalance,
          comment: `Trade ${i + 1}: ${profit >= 0 ? 'Profit' : 'Loss'} ${Math.abs(profit).toFixed(2)}`,
        });
        balanceHistory.push(balanceEntry);

        // Add equity history entry
        const equityEntry = equityRepository.create({
          metaTraderAccountId: account.id,
          time: trade.closeTime || tradeTime,
          equity: currentEquity,
        });
        equityHistory.push(equityEntry);
      }

      // Save all trades
      if (trades.length > 0) {
        await transactionRepository.save(trades);
        this.logger.log(`  Created ${trades.length} trades for account ${account.login}`);
      }

      // Save balance history
      if (balanceHistory.length > 0) {
        await balanceRepository.save(balanceHistory);
        this.logger.log(`  Created ${balanceHistory.length} balance history entries for account ${account.login}`);
      }

      // Save equity history
      if (equityHistory.length > 0) {
        await equityRepository.save(equityHistory);
        this.logger.log(`  Created ${equityHistory.length} equity history entries for account ${account.login}`);
      }

      // Create/update account data snapshot
      const existingAccountData = await accountDataRepository.findOne({
        where: { metaTraderAccountId: account.id },
      });

      const accountData = existingAccountData || accountDataRepository.create({
        metaTraderAccountId: account.id,
      });

      accountData.balance = currentBalance;
      accountData.equity = currentEquity;
      accountData.profit = totalProfit;
      accountData.margin = parseFloat((currentBalance * 0.1).toFixed(2)); // 10% margin
      accountData.freeMargin = parseFloat((currentEquity - accountData.margin).toFixed(2));
      accountData.currency = 'USD';
      accountData.leverage = 100;
      accountData.positions = [];
      accountData.orders = [];
      accountData.dataTimestamp = now;

      await accountDataRepository.save(accountData);

      // Create/update performance metrics
      const existingPerformance = await performanceRepository.findOne({
        where: { metaTraderAccountId: account.id },
      });

      const performance = existingPerformance || performanceRepository.create({
        metaTraderAccountId: account.id,
      });

      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
      const winRate = totalTrades > 0 ? (profitTrades / totalTrades) * 100 : 0;
      const averageProfit = profitTrades > 0 ? grossProfit / profitTrades : 0;
      const averageLoss = lossTrades > 0 ? grossLoss / lossTrades : 0;
      const profitPercent = initialBalance > 0 ? (totalProfit / initialBalance) * 100 : 0;

      performance.balance = currentBalance;
      performance.equity = currentEquity;
      performance.profit = totalProfit;
      performance.margin = accountData.margin;
      performance.freeMargin = accountData.freeMargin;
      performance.marginLevel = accountData.margin > 0 ? (currentEquity / accountData.margin) * 100 : 0;
      performance.totalNetProfit = totalProfit;
      performance.grossProfit = grossProfit;
      performance.grossLoss = grossLoss;
      performance.profitFactor = parseFloat(profitFactor.toFixed(4));
      performance.expectedPayoff = totalTrades > 0 ? totalProfit / totalTrades : 0;
      performance.recoveryFactor = grossLoss > 0 ? totalProfit / grossLoss : totalProfit > 0 ? 999 : 0;
      performance.sharpeRatio = parseFloat((Math.random() * 2 - 1).toFixed(4));
      performance.balanceDrawdownAbsolute = Math.max(0, initialBalance - Math.min(...balanceHistory.map(b => Number(b.balance))));
      performance.balanceDrawdownMaximal = performance.balanceDrawdownAbsolute;
      performance.balanceDrawdownRelativePercent = initialBalance > 0 ? (performance.balanceDrawdownAbsolute / initialBalance) * 100 : 0;
      performance.totalTrades = totalTrades;
      performance.profitTrades = profitTrades;
      performance.lossTrades = lossTrades;
      performance.largestProfitTrade = trades.length > 0 ? Math.max(...trades.map(t => Number(t.profit || 0))) : 0;
      performance.largestLossTrade = trades.length > 0 ? Math.min(...trades.map(t => Number(t.profit || 0))) : 0;
      performance.averageProfitTrade = parseFloat(averageProfit.toFixed(2));
      performance.averageLossTrade = parseFloat(averageLoss.toFixed(2));
      performance.maxConsecutiveWins = this.calculateMaxConsecutiveWins(trades);
      performance.maxConsecutiveLosses = this.calculateMaxConsecutiveLosses(trades);
      performance.dataTimestamp = now;

      await performanceRepository.save(performance);
      this.logger.log(`  Created/updated performance metrics for account ${account.login}`);
    }

    this.logger.log('✓ Marathon endpoints data seeded successfully');
  }

  private calculateMaxConsecutiveWins(trades: TokyoTransactionHistory[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (trade.profit && Number(trade.profit) > 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  private calculateMaxConsecutiveLosses(trades: TokyoTransactionHistory[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (trade.profit && Number(trade.profit) <= 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  async clean(): Promise<void> {
    const hasTokyoTables = await this.hasTable('tokyo_transaction_history') ||
                           await this.hasTable('tokyo_balance_history') ||
                           await this.hasTable('tokyo_equity_history') ||
                           await this.hasTable('tokyo_account_data') ||
                           await this.hasTable('tokyo_performance');

    if (!hasTokyoTables) {
      return;
    }

    this.logger.log('Cleaning marathon endpoints data...');

    // Get all MetaTrader accounts that are linked to marathon participants
    const manager = this.getManager();
    const accountRepository = manager.getRepository(MetaTraderAccount);
    
    const accounts = await accountRepository
      .createQueryBuilder('account')
      .where('account.marathonParticipantId IS NOT NULL')
      .getMany();

    if (accounts.length === 0) {
      this.logger.log('No marathon participant accounts found. Skipping cleanup.');
      return;
    }

    const accountIds = accounts.map(a => a.id);

    // Clean up Tokyo data for these accounts
    if (await this.hasTable('tokyo_transaction_history')) {
      await this.query(
        `DELETE FROM tokyo_transaction_history WHERE "metaTraderAccountId" IN (${accountIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        accountIds,
      );
    }

    if (await this.hasTable('tokyo_balance_history')) {
      await this.query(
        `DELETE FROM tokyo_balance_history WHERE "metaTraderAccountId" IN (${accountIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        accountIds,
      );
    }

    if (await this.hasTable('tokyo_equity_history')) {
      await this.query(
        `DELETE FROM tokyo_equity_history WHERE "metaTraderAccountId" IN (${accountIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        accountIds,
      );
    }

    if (await this.hasTable('tokyo_account_data')) {
      await this.query(
        `DELETE FROM tokyo_account_data WHERE "metaTraderAccountId" IN (${accountIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        accountIds,
      );
    }

    if (await this.hasTable('tokyo_performance')) {
      await this.query(
        `DELETE FROM tokyo_performance WHERE "metaTraderAccountId" IN (${accountIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        accountIds,
      );
    }

    this.logger.log('✓ Marathon endpoints data cleaned');
  }
}

