import { ApiProperty } from '@nestjs/swagger';

export class FinancialStatsDto {
  @ApiProperty({
    description: 'Current virtual wallet balance',
    example: 1250.50,
  })
  current_balance: number;

  @ApiProperty({
    description: 'Total deposits made',
    example: 5000.00,
  })
  total_deposits: number;

  @ApiProperty({
    description: 'Total amount spent on marathon entry fees',
    example: 250.00,
  })
  total_marathon_fees: number;

  @ApiProperty({
    description: 'Total earnings from marathon prizes',
    example: 500.00,
  })
  total_marathon_earnings: number;

  @ApiProperty({
    description: 'Total withdrawals',
    example: 1000.00,
  })
  total_withdrawals: number;

  @ApiProperty({
    description: 'Net profit (deposits + earnings - fees - withdrawals)',
    example: 4250.50,
  })
  net_profit: number;
}

export class ActivityStatsDto {
  @ApiProperty({
    description: 'Number of active (ongoing) marathons',
    example: 2,
  })
  active_marathons: number;

  @ApiProperty({
    description: 'Number of upcoming marathons',
    example: 5,
  })
  upcoming_marathons: number;

  @ApiProperty({
    description: 'Total number of tickets',
    example: 10,
  })
  total_tickets: number;

  @ApiProperty({
    description: 'Number of open tickets',
    example: 3,
  })
  open_tickets: number;
}

export class AccountStatsDto {
  @ApiProperty({
    description: 'Total number of MetaTrader accounts',
    example: 3,
  })
  total_accounts: number;

  @ApiProperty({
    description: 'Number of deployed accounts',
    example: 2,
  })
  deployed_accounts: number;
}

export class OverviewStatsResponseDto {
  @ApiProperty({
    description: 'Financial statistics',
    type: FinancialStatsDto,
  })
  financial: FinancialStatsDto;

  @ApiProperty({
    description: 'Activity statistics',
    type: ActivityStatsDto,
  })
  activity: ActivityStatsDto;

  @ApiProperty({
    description: 'Account statistics',
    type: AccountStatsDto,
  })
  accounts: AccountStatsDto;
}

