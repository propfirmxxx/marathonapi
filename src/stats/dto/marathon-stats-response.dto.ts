import { ApiProperty } from '@nestjs/swagger';

export class MarathonChartDto {
  @ApiProperty({
    description: 'Labels for chart periods (months, weeks, or years)',
    example: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    type: [String],
  })
  months: string[];

  @ApiProperty({
    description: 'Series data for chart',
    example: [2, 3, 1, 2, 4, 3, 2, 1],
    type: [Number],
  })
  series: number[];
}

export class TotalMarathonsDto {
  @ApiProperty({
    description: 'Percentage change from first period to last period',
    example: '+5.0',
  })
  change: string;

  @ApiProperty({
    description: 'Total number of marathons participated',
    example: 12,
  })
  value: number;

  @ApiProperty({
    description: 'Chart data for visualization',
    type: MarathonChartDto,
  })
  chart: MarathonChartDto;
}

export class MarathonsWonDto {
  @ApiProperty({
    description: 'Percentage change from first period to last period',
    example: '+10.0',
  })
  change: string;

  @ApiProperty({
    description: 'Total number of marathons won',
    example: 3,
  })
  value: number;

  @ApiProperty({
    description: 'Chart data for visualization',
    type: MarathonChartDto,
  })
  chart: MarathonChartDto;
}

export class MarathonsWinrateDto {
  @ApiProperty({
    description: 'Percentage change from first period to last period',
    example: '+2.5',
  })
  change: string;

  @ApiProperty({
    description: 'Win rate percentage',
    example: 25.0,
  })
  value: number;

  @ApiProperty({
    description: 'Chart data for visualization',
    type: MarathonChartDto,
  })
  chart: MarathonChartDto;
}

export class MarathonStatsOverviewDto {
  @ApiProperty({
    description: 'Total marathons statistics',
    type: TotalMarathonsDto,
  })
  total_marathons: TotalMarathonsDto;

  @ApiProperty({
    description: 'Marathons won statistics',
    type: MarathonsWonDto,
  })
  marathons_won: MarathonsWonDto;

  @ApiProperty({
    description: 'Marathons winrate statistics',
    type: MarathonsWinrateDto,
  })
  marathons_winrate: MarathonsWinrateDto;
}

export class MarathonStatsResponseDto {
  @ApiProperty({
    description: 'Overview statistics',
    type: MarathonStatsOverviewDto,
  })
  overview: MarathonStatsOverviewDto;
}

