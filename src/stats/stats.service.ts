import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../withdrawals/entities/withdrawal.entity';
import { GroupByPeriod } from './dto/get-withdrawal-stats.dto';
import { WithdrawalStatsResponseDto } from './dto/withdrawal-stats-response.dto';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
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
}

