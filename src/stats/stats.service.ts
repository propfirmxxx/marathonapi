import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';
import { Marathon } from '../marathon/entities/marathon.entity';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';
import { Payment } from '../payment/entities/payment.entity';
import { VirtualWallet } from '../virtual-wallet/entities/virtual-wallet.entity';
import { VirtualWalletTransaction, VirtualWalletTransactionType } from '../virtual-wallet/entities/virtual-wallet-transaction.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { MetaTraderAccount, MetaTraderAccountStatus } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { MarathonStatus } from '../marathon/enums/marathon-status.enum';
import { PaymentType } from '../payment/enums/payment-type.enum';
import { PaymentStatus } from '../payment/enums/payment-status.enum';
import { GroupByPeriod } from './dto/get-withdrawal-stats.dto';
import { WithdrawalStatsResponseDto } from './dto/withdrawal-stats-response.dto';
import { MarathonStatsResponseDto } from './dto/marathon-stats-response.dto';
import { OverviewStatsResponseDto } from './dto/overview-stats-response.dto';
import { MarathonLeaderboardService } from '../marathon/marathon-leaderboard.service';
import { LiveAccountDataService } from '../marathon/live-account-data.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class StatsService {
  private readonly CACHE_PREFIX = 'stats';
  private readonly CACHE_TTL = 300000; // 5 minutes for stats (they change frequently)

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(VirtualWallet)
    private readonly virtualWalletRepository: Repository<VirtualWallet>,
    @InjectRepository(VirtualWalletTransaction)
    private readonly virtualWalletTransactionRepository: Repository<VirtualWalletTransaction>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
    private readonly marathonLeaderboardService: MarathonLeaderboardService,
    private readonly liveAccountDataService: LiveAccountDataService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get general statistics
   * This method can be extended with specific statistics as needed
   */
  async getStats(): Promise<any> {
    // TODO: Implement specific statistics based on requirements
    return {
      message: 'Stats module is ready. Implement specific statistics here.',
    };
  }

  /**
   * Get withdrawal statistics for a user
   */
  async getWithdrawalStats(
    userId: string,
    startDate?: string,
    endDate?: string,
    groupBy: GroupByPeriod = GroupByPeriod.MONTH,
  ): Promise<WithdrawalStatsResponseDto> {
    const cacheKey = this.cacheService.generateKey(
      this.CACHE_PREFIX,
      'withdrawal',
      userId,
      startDate || 'all',
      endDate || 'all',
      groupBy,
    );

    return await this.cacheService.wrap(
      cacheKey,
      async () => this.calculateWithdrawalStats(userId, startDate, endDate, groupBy),
      this.CACHE_TTL,
    );
  }

  private async calculateWithdrawalStats(
    userId: string,
    startDate?: string,
    endDate?: string,
    groupBy: GroupByPeriod = GroupByPeriod.MONTH,
  ): Promise<WithdrawalStatsResponseDto> {
    // Determine date truncation based on groupBy
    let dateTruncFormat: string;
    switch (groupBy) {
      case GroupByPeriod.WEEK:
        dateTruncFormat = 'week';
        break;
      case GroupByPeriod.MONTH:
        dateTruncFormat = 'month';
        break;
      case GroupByPeriod.YEAR:
        dateTruncFormat = 'year';
        break;
      default:
        dateTruncFormat = 'month';
    }

    // Get grouped data using raw SQL for DATE_TRUNC
    const queryBuilder = this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select(
        `DATE_TRUNC('${dateTruncFormat}', withdrawal.created_at)`,
        'period',
      )
      .addSelect('SUM(withdrawal.amount)', 'total')
      .where('withdrawal.user_id = :userId', { userId });

    if (startDate) {
      queryBuilder.andWhere('withdrawal.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('withdrawal.created_at <= :endDate', {
        endDate: endDateTime,
      });
    }

    const groupedData = await queryBuilder
      .groupBy(`DATE_TRUNC('${dateTruncFormat}', withdrawal.created_at)`)
      .orderBy('period', 'ASC')
      .getRawMany();

    // Calculate total withdrawals
    const totalWithdrawals = groupedData.reduce(
      (sum, item) => sum + parseFloat(item.total || '0'),
      0,
    );

    // Format data for chart
    const months: string[] = [];
    const series: number[] = [];
    const changes: string[] = [];

    groupedData.forEach((item, index) => {
      const total = parseFloat(item.total || '0');
      const period = new Date(item.period);

      // Format label based on groupBy
      let label: string;
      switch (groupBy) {
        case GroupByPeriod.WEEK:
          label = this.formatWeekLabel(period);
          break;
        case GroupByPeriod.MONTH:
          label = this.formatMonthLabel(period);
          break;
        case GroupByPeriod.YEAR:
          label = period.getFullYear().toString();
          break;
        default:
          label = this.formatMonthLabel(period);
      }

      months.push(label);
      series.push(total);

      // Calculate change percentage
      if (index === 0) {
        changes.push('0');
      } else {
        const prevTotal = parseFloat(groupedData[index - 1].total || '0');
        if (prevTotal === 0) {
          changes.push(total > 0 ? '+100' : '0');
        } else {
          const changePercent = ((total - prevTotal) / prevTotal) * 100;
          changes.push(
            changePercent >= 0
              ? `+${changePercent.toFixed(1)}`
              : changePercent.toFixed(1),
          );
        }
      }
    });

    // Calculate overall change (last period vs first period)
    let overallChange = '0';
    if (groupedData.length >= 2) {
      const firstTotal = parseFloat(groupedData[0].total || '0');
      const lastTotal = parseFloat(
        groupedData[groupedData.length - 1].total || '0',
      );
      if (firstTotal === 0) {
        overallChange = lastTotal > 0 ? '+100' : '0';
      } else {
        const changePercent = ((lastTotal - firstTotal) / firstTotal) * 100;
        overallChange =
          changePercent >= 0
            ? `+${changePercent.toFixed(1)}`
            : changePercent.toFixed(1);
      }
    }

    return {
      overview: {
        total_withdrawals: {
          change: overallChange,
          value: totalWithdrawals,
          chart: {
            months,
            series,
          },
        },
      },
    };
  }

  /**
   * Get marathon statistics for a user
   */
  async getMarathonStats(
    userId: string,
    startDate?: string,
    endDate?: string,
    groupBy: GroupByPeriod = GroupByPeriod.MONTH,
  ): Promise<MarathonStatsResponseDto> {
    const cacheKey = this.cacheService.generateKey(
      this.CACHE_PREFIX,
      'marathon',
      userId,
      startDate || 'all',
      endDate || 'all',
      groupBy,
    );

    return await this.cacheService.wrap(
      cacheKey,
      async () => this.calculateMarathonStats(userId, startDate, endDate, groupBy),
      this.CACHE_TTL,
    );
  }

  private async calculateMarathonStats(
    userId: string,
    startDate?: string,
    endDate?: string,
    groupBy: GroupByPeriod = GroupByPeriod.MONTH,
  ): Promise<MarathonStatsResponseDto> {
    // Determine date truncation based on groupBy
    let dateTruncFormat: string;
    switch (groupBy) {
      case GroupByPeriod.WEEK:
        dateTruncFormat = 'week';
        break;
      case GroupByPeriod.MONTH:
        dateTruncFormat = 'month';
        break;
      case GroupByPeriod.YEAR:
        dateTruncFormat = 'year';
        break;
      default:
        dateTruncFormat = 'month';
    }

    // Get all participants for the user
    const participantsQuery = this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.marathon', 'marathon')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.isActive = :isActive', { isActive: true });

    if (startDate) {
      participantsQuery.andWhere('participant.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      participantsQuery.andWhere('participant.created_at <= :endDate', {
        endDate: endDateTime,
      });
    }

    const participants = await participantsQuery.getMany();

    // Get finished marathons where user participated
    const finishedMarathons = participants.filter(
      (p) => p.marathon.status === MarathonStatus.FINISHED,
    );

    // Get snapshots for all accounts
    const allSnapshots = this.liveAccountDataService.getAllSnapshots();

    // Calculate wins (user rank 1 in finished marathons)
    // Use a map to cache leaderboards by marathon ID
    const leaderboardCache = new Map<string, any>();
    let wins = 0;
    for (const participant of finishedMarathons) {
      let leaderboard = leaderboardCache.get(participant.marathon.id);
      if (!leaderboard) {
        leaderboard = await this.marathonLeaderboardService.calculateLeaderboard(
          participant.marathon.id,
          allSnapshots,
        );
        if (leaderboard) {
          leaderboardCache.set(participant.marathon.id, leaderboard);
        }
      }
      if (leaderboard) {
        const userEntry = leaderboard.entries.find(
          (e) => e.userId === userId && e.rank === 1,
        );
        if (userEntry) {
          wins++;
        }
      }
    }

    // Group participants by period for chart
    const groupedData = await this.participantRepository
      .createQueryBuilder('participant')
      .select(
        `DATE_TRUNC('${dateTruncFormat}', participant.created_at)`,
        'period',
      )
      .addSelect('COUNT(participant.id)', 'count')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.isActive = :isActive', { isActive: true });

    if (startDate) {
      groupedData.andWhere('participant.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      groupedData.andWhere('participant.created_at <= :endDate', {
        endDate: endDateTime,
      });
    }

    const groupedParticipants = await groupedData
      .groupBy(`DATE_TRUNC('${dateTruncFormat}', participant.created_at)`)
      .orderBy('period', 'ASC')
      .getRawMany();

    // Calculate total marathons
    const totalMarathons = participants.length;

    // Calculate winrate
    const winrate = totalMarathons > 0 ? (wins / totalMarathons) * 100 : 0;

    // Format data for charts
    const months: string[] = [];
    const totalMarathonsSeries: number[] = [];
    const winsSeries: number[] = [];
    const winrateSeries: number[] = [];

    // Group wins by period (reuse cached leaderboards)
    const winsByPeriod = new Map<string, number>();
    for (const participant of finishedMarathons) {
      const period = new Date(participant.marathon.endDate);
      let periodKey: string;
      switch (groupBy) {
        case GroupByPeriod.WEEK:
          periodKey = this.getWeekKey(period);
          break;
        case GroupByPeriod.MONTH:
          periodKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
          break;
        case GroupByPeriod.YEAR:
          periodKey = period.getFullYear().toString();
          break;
        default:
          periodKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
      }

      // Use cached leaderboard
      const leaderboard = leaderboardCache.get(participant.marathon.id);
      if (leaderboard) {
        const userEntry = leaderboard.entries.find(
          (e) => e.userId === userId && e.rank === 1,
        );
        if (userEntry) {
          winsByPeriod.set(periodKey, (winsByPeriod.get(periodKey) || 0) + 1);
        }
      }
    }

    groupedParticipants.forEach((item, index) => {
      const period = new Date(item.period);
      let label: string;
      switch (groupBy) {
        case GroupByPeriod.WEEK:
          label = this.formatWeekLabel(period);
          break;
        case GroupByPeriod.MONTH:
          label = this.formatMonthLabel(period);
          break;
        case GroupByPeriod.YEAR:
          label = period.getFullYear().toString();
          break;
        default:
          label = this.formatMonthLabel(period);
      }

      months.push(label);
      const count = parseInt(item.count || '0', 10);
      totalMarathonsSeries.push(count);

      // Get wins for this period
      let periodKey: string;
      switch (groupBy) {
        case GroupByPeriod.WEEK:
          periodKey = this.getWeekKey(period);
          break;
        case GroupByPeriod.MONTH:
          periodKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
          break;
        case GroupByPeriod.YEAR:
          periodKey = period.getFullYear().toString();
          break;
        default:
          periodKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
      }
      const periodWins = winsByPeriod.get(periodKey) || 0;
      winsSeries.push(periodWins);

      // Calculate winrate for this period
      const periodWinrate = count > 0 ? (periodWins / count) * 100 : 0;
      winrateSeries.push(periodWinrate);
    });

    // Calculate overall changes
    const totalMarathonsChange = this.calculateChange(
      groupedParticipants.map((item) => parseInt(item.count || '0', 10)),
    );
    const winsChange = this.calculateChange(winsSeries);
    const winrateChange = this.calculateChange(winrateSeries);

    return {
      overview: {
        total_marathons: {
          change: totalMarathonsChange,
          value: totalMarathons,
          chart: {
            months,
            series: totalMarathonsSeries,
          },
        },
        marathons_won: {
          change: winsChange,
          value: wins,
          chart: {
            months,
            series: winsSeries,
          },
        },
        marathons_winrate: {
          change: winrateChange,
          value: winrate,
          chart: {
            months,
            series: winrateSeries,
          },
        },
      },
    };
  }

  private calculateChange(series: number[]): string {
    if (series.length < 2) {
      return '0';
    }
    const first = series[0] || 0;
    const last = series[series.length - 1] || 0;
    if (first === 0) {
      return last > 0 ? '+100' : '0';
    }
    const changePercent = ((last - first) / first) * 100;
    return changePercent >= 0
      ? `+${changePercent.toFixed(1)}`
      : changePercent.toFixed(1);
  }

  private getWeekKey(date: Date): string {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek;
    weekStart.setDate(diff);
    return `${weekStart.getFullYear()}-W${Math.ceil(
      (weekStart.getDate() + 1) / 7,
    )}`;
  }

  private formatWeekLabel(date: Date): string {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek;
    weekStart.setDate(diff);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}-${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
  }

  private formatMonthLabel(date: Date): string {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return monthNames[date.getMonth()];
  }

  /**
   * Get comprehensive overview statistics for a user
   */
  async getOverviewStats(userId: string): Promise<OverviewStatsResponseDto> {
    const cacheKey = this.cacheService.generateKey(
      this.CACHE_PREFIX,
      'overview',
      userId,
    );

    return await this.cacheService.wrap(
      cacheKey,
      async () => this.calculateOverviewStats(userId),
      this.CACHE_TTL,
    );
  }

  private async calculateOverviewStats(userId: string): Promise<OverviewStatsResponseDto> {
    // Get virtual wallet balance
    const virtualWallet = await this.virtualWalletRepository.findOne({
      where: { userId },
    });
    const currentBalance = virtualWallet ? Number(virtualWallet.balance) : 0;

    // Get total deposits (completed wallet charge payments)
    const totalDepositsResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.paymentType = :type', { type: PaymentType.WALLET_CHARGE })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();
    const totalDeposits = parseFloat(totalDepositsResult?.total || '0');

    // Get total marathon fees (completed marathon join payments)
    const totalMarathonFeesResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.paymentType = :type', { type: PaymentType.MARATHON_JOIN })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();
    const totalMarathonFees = parseFloat(totalMarathonFeesResult?.total || '0');

    // Get total marathon earnings (CREDIT transactions from marathon prizes)
    // Assuming marathon prize credits have referenceType 'marathon_prize' or similar
    const totalMarathonEarningsResult = await this.virtualWalletTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.wallet', 'wallet')
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .where('wallet.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: VirtualWalletTransactionType.CREDIT })
      .andWhere(
        "(transaction.referenceType LIKE '%marathon%' OR transaction.description LIKE '%marathon%' OR transaction.description LIKE '%prize%')",
      )
      .getRawOne();
    const totalMarathonEarnings = parseFloat(totalMarathonEarningsResult?.total || '0');

    // Get total withdrawals
    const totalWithdrawalsResult = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
      .where('withdrawal.userId = :userId', { userId })
      .getRawOne();
    const totalWithdrawals = parseFloat(totalWithdrawalsResult?.total || '0');

    // Calculate net profit
    const netProfit = totalDeposits + totalMarathonEarnings - totalMarathonFees - totalWithdrawals;

    // Get active marathons count (where user is participant)
    const activeMarathonsCount = await this.participantRepository
      .createQueryBuilder('participant')
      .leftJoin('participant.marathon', 'marathon')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.isActive = :isActive', { isActive: true })
      .andWhere('marathon.status = :status', { status: MarathonStatus.ONGOING })
      .getCount();

    // Get upcoming marathons count (where user is participant)
    const upcomingMarathonsCount = await this.participantRepository
      .createQueryBuilder('participant')
      .leftJoin('participant.marathon', 'marathon')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.isActive = :isActive', { isActive: true })
      .andWhere('marathon.status = :status', { status: MarathonStatus.UPCOMING })
      .getCount();

    // Get tickets count
    const totalTickets = await this.ticketRepository.count({
      where: { createdBy: { id: userId } },
    });

    // Get open tickets count (OPEN, IN_PROGRESS, WAITING_FOR_USER)
    const openTickets = await this.ticketRepository.count({
      where: {
        createdBy: { id: userId },
        status: TicketStatus.OPEN,
      },
    });
    const inProgressTickets = await this.ticketRepository.count({
      where: {
        createdBy: { id: userId },
        status: TicketStatus.IN_PROGRESS,
      },
    });
    const waitingTickets = await this.ticketRepository.count({
      where: {
        createdBy: { id: userId },
        status: TicketStatus.WAITING_FOR_USER,
      },
    });
    const openTicketsCount = openTickets + inProgressTickets + waitingTickets;

    // Get MetaTrader accounts count
    const totalAccounts = await this.metaTraderAccountRepository.count({
      where: { userId },
    });

    const deployedAccounts = await this.metaTraderAccountRepository.count({
      where: {
        userId,
        status: MetaTraderAccountStatus.DEPLOYED,
      },
    });

    return {
      financial: {
        current_balance: currentBalance,
        total_deposits: totalDeposits,
        total_marathon_fees: totalMarathonFees,
        total_marathon_earnings: totalMarathonEarnings,
        total_withdrawals: totalWithdrawals,
        net_profit: netProfit,
      },
      activity: {
        active_marathons: activeMarathonsCount,
        upcoming_marathons: upcomingMarathonsCount,
        total_tickets: totalTickets,
        open_tickets: openTicketsCount,
      },
      accounts: {
        total_accounts: totalAccounts,
        deployed_accounts: deployedAccounts,
      },
    };
  }
}

