import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalChartDto {
  @ApiProperty({
    description: 'Labels for chart periods (months, weeks, or years)',
    example: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    type: [String],
  })
  months: string[];

  @ApiProperty({
    description: 'Series data for chart (total withdrawal amounts per period)',
    example: [18, 19, 31, 8, 16, 37, 12, 33],
    type: [Number],
  })
  series: number[];
}

export class TotalWithdrawalsDto {
  @ApiProperty({
    description: 'Percentage change from first period to last period',
    example: '+2.5',
  })
  change: string;

  @ApiProperty({
    description: 'Total withdrawal amount in the selected period',
    example: 18750,
  })
  value: number;

  @ApiProperty({
    description: 'Chart data for visualization',
    type: WithdrawalChartDto,
  })
  chart: WithdrawalChartDto;
}

export class WithdrawalStatsOverviewDto {
  @ApiProperty({
    description: 'Total withdrawals statistics',
    type: TotalWithdrawalsDto,
  })
  total_withdrawals: TotalWithdrawalsDto;
}

export class WithdrawalStatsResponseDto {
  @ApiProperty({
    description: 'Overview statistics',
    type: WithdrawalStatsOverviewDto,
  })
  overview: WithdrawalStatsOverviewDto;
}

