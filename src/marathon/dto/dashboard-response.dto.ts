import { ApiProperty } from '@nestjs/swagger';

export class TradesWinrateDto {
  @ApiProperty({ example: 100 })
  total_trades: number;

  @ApiProperty({ example: 50 })
  win_trades: number;

  @ApiProperty({ example: 50 })
  loss_trades: number;

  @ApiProperty({ example: 50.00 })
  percentage: number;
}

export class CurrencyPairSeriesDto {
  @ApiProperty({ example: 'GBP/USD' })
  label: string;

  @ApiProperty({ example: 240 })
  value: number;

  @ApiProperty({ example: 20.20 })
  percentage: number;
}

export class CurrencyPairsDto {
  @ApiProperty({ type: [CurrencyPairSeriesDto] })
  series: CurrencyPairSeriesDto[];
}

export class CurrencyPairTreemapByTradesDto {
  @ApiProperty({ example: 'EUR/USD' })
  x: string;

  @ApiProperty({ example: 681 })
  y: number;
}

export class CurrencyPairTreemapPerformanceDto {
  @ApiProperty({ example: 'EUR/USD' })
  label: string;

  @ApiProperty({ example: 15.00 })
  performance: number;
}

export class CurrencyPairsTreemapDto {
  @ApiProperty({ type: [CurrencyPairTreemapByTradesDto] })
  byTrades: CurrencyPairTreemapByTradesDto[];

  @ApiProperty({ type: [CurrencyPairTreemapPerformanceDto] })
  performance: CurrencyPairTreemapPerformanceDto[];
}

export class CurrencyPairsWinrateSeriesDto {
  @ApiProperty({ example: 'Win' })
  name: string;

  @ApiProperty({ type: [Number], example: [75.1, 76.5, 63.6] })
  data: number[];
}

export class CurrencyPairsWinrateDto {
  @ApiProperty({ type: [String], example: ['GBP/USD', 'EUR/USD', 'USD/JPY'] })
  categories: string[];

  @ApiProperty({ type: [CurrencyPairsWinrateSeriesDto] })
  series: CurrencyPairsWinrateSeriesDto[];
}

export class TradesShortLongSeriesDto {
  @ApiProperty({ example: 'Long (55.40%)' })
  label: string;

  @ApiProperty({ example: 125 })
  value: number;

  @ApiProperty({ example: 55.40 })
  percentage: number;
}

export class TradesShortLongDto {
  @ApiProperty({ type: [TradesShortLongSeriesDto] })
  series: TradesShortLongSeriesDto[];
}

export class BestMarathonDto {
  @ApiProperty({ example: 'marathon-2' })
  id: string;

  @ApiProperty({ example: 23.10 })
  profitPercentage: number;

  @ApiProperty({ example: 2 })
  rank: number;

  @ApiProperty({ example: 7868.00 })
  prize: number;

  @ApiProperty({ example: '2025-10-17' })
  date: string;
}

export class LastMarathonDto {
  @ApiProperty({ example: 'marathon-735' })
  id: string;

  @ApiProperty({ example: 'Spring Trading Championship 2025' })
  name: string;

  @ApiProperty({ example: false })
  isLive: boolean;

  @ApiProperty({ example: '2025-11-16T16:43:26.535Z' })
  startDate: string;

  @ApiProperty({ example: '2025-11-16T16:43:26.535Z' })
  endDate: string;

  @ApiProperty({ example: 54 })
  currentRank: number;

  @ApiProperty({ example: 533 })
  totalParticipants: number;

  @ApiProperty({ example: 19.02 })
  profitPercentage: number;

  @ApiProperty({ example: 0.00 })
  prize: number;
}

export class LastTradeDto {
  @ApiProperty({ example: '12345', nullable: true })
  positionId?: number | null;

  @ApiProperty({ example: '67890', nullable: true })
  orderTicket?: number | null;

  @ApiProperty({ example: 'BUY', nullable: true })
  type?: string | null;

  @ApiProperty({ example: 'AUD/USD', nullable: true })
  symbol?: string | null;

  @ApiProperty({ example: 0.31, nullable: true })
  volume?: number | null;

  @ApiProperty({ example: 1.0850, nullable: true })
  openPrice?: number | null;

  @ApiProperty({ example: 1.0900, nullable: true })
  closePrice?: number | null;

  @ApiProperty({ example: '2025-11-18T15:43:26.535Z', nullable: true })
  openTime?: Date | null;

  @ApiProperty({ example: '2025-11-18T16:43:26.535Z', nullable: true })
  closeTime?: Date | null;

  @ApiProperty({ example: -235.65, nullable: true })
  profit?: number | null;

  @ApiProperty({ example: -2.50, nullable: true })
  commission?: number | null;

  @ApiProperty({ example: -0.50, nullable: true })
  swap?: number | null;

  @ApiProperty({ example: 1.0800, nullable: true })
  stopLoss?: number | null;

  @ApiProperty({ example: 1.0950, nullable: true })
  takeProfit?: number | null;
}

export class UserDetailsDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'Experienced trader specializing in forex markets', nullable: true })
  about?: string | null;

  @ApiProperty({ example: 'United States', nullable: true })
  country?: string | null;

  @ApiProperty({ example: 'https://instagram.com/johndoe', nullable: true })
  instagramUrl?: string | null;

  @ApiProperty({ example: 'https://twitter.com/johndoe', nullable: true })
  twitterUrl?: string | null;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', nullable: true })
  linkedinUrl?: string | null;

  @ApiProperty({ example: 'https://t.me/johndoe', nullable: true })
  telegramUrl?: string | null;
}

export class UserStatsDto {
  @ApiProperty({ example: 5000.50 })
  totalWithdrawal: number;

  @ApiProperty({ example: 15 })
  totalMarathons: number;

  @ApiProperty({ example: 3 })
  marathonsWon: number;

  @ApiProperty({ example: 20.00 })
  marathonsWinrate: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: TradesWinrateDto })
  tradesWinrate: TradesWinrateDto;

  @ApiProperty({ type: CurrencyPairsDto })
  currency_pairs: CurrencyPairsDto;

  @ApiProperty({ type: CurrencyPairsTreemapDto })
  currency_pairs_treemap: CurrencyPairsTreemapDto;

  @ApiProperty({ type: CurrencyPairsWinrateDto })
  currency_pairs_winrate: CurrencyPairsWinrateDto;

  @ApiProperty({ type: TradesShortLongDto })
  trades_short_long: TradesShortLongDto;

  @ApiProperty({ type: [BestMarathonDto] })
  best_marathons: BestMarathonDto[];

  @ApiProperty({ type: LastMarathonDto, nullable: true })
  last_marathon: LastMarathonDto | null;

  @ApiProperty({ type: [LastTradeDto] })
  last_trades: LastTradeDto[];

  @ApiProperty({ type: UserDetailsDto, nullable: true })
  user?: UserDetailsDto | null;

  @ApiProperty({ type: UserStatsDto })
  stats: UserStatsDto;
}

