import { ApiProperty } from '@nestjs/swagger';
import { MarathonRulesDto } from './marathon-rules.dto';

export class MarathonLiveDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Spring Trading Marathon 2024' })
  name: string;

  @ApiProperty({ example: true })
  isLive: boolean;

  @ApiProperty({ example: '2025-11-11T16:37:32.588Z' })
  startDate: string;

  @ApiProperty({ example: '2025-11-25T16:37:32.588Z' })
  endDate: string;

  @ApiProperty({ example: 39 })
  currentRank: number;

  @ApiProperty({ example: 500 })
  totalParticipants: number;

  @ApiProperty({ example: '7.51' })
  profitPercentage: string;

  @ApiProperty({ example: null, nullable: true })
  prize: number | null;

  @ApiProperty({ example: 71, nullable: true })
  score?: number | null;

  @ApiProperty({ example: 50 })
  totalTrades: number;

  @ApiProperty({ example: 32 })
  successfulTrades: number;

  @ApiProperty({ example: 18 })
  stoppedTrades: number;

  @ApiProperty({ example: 64 })
  winRate: number;

  @ApiProperty({ example: 16446.43 })
  equity: number;

  @ApiProperty({ example: 16372.37 })
  balance: number;

  @ApiProperty({ example: 6372.37 })
  totalProfitLoss: number;

  @ApiProperty({ example: 127.45 })
  averageTradeProfitLoss: number;

  @ApiProperty({ example: 538.21 })
  bestTrade: number;

  @ApiProperty({ example: -311.81 })
  worstTrade: number;

  @ApiProperty({ example: 7 })
  daysActive: number;
}

export class RiskMetricsDto {
  @ApiProperty({ example: 39.42 })
  riskFloat: number;

  @ApiProperty({ example: 100 })
  riskFloatMax: number;

  @ApiProperty({ example: 33.38 })
  drawdown: number;

  @ApiProperty({ example: 100 })
  drawdownMax: number;
}

export class TradeHistoryItemDto {
  @ApiProperty({ example: 'uuid-string', nullable: true })
  id?: string | null;

  @ApiProperty({ example: 12345, nullable: true })
  positionId?: number | null;

  @ApiProperty({ example: 67890, nullable: true })
  orderTicket?: number | null;

  @ApiProperty({ example: '2025-11-18T16:37:32.588Z', nullable: true })
  openTime?: Date | null;

  @ApiProperty({ example: '2025-11-18T17:37:32.588Z', nullable: true })
  closeTime?: Date | null;

  @ApiProperty({ example: 'BUY', nullable: true })
  type?: string | null;

  @ApiProperty({ example: 1.47851, nullable: true })
  volume?: number | null;

  @ApiProperty({ example: 'NZDUSD', nullable: true })
  symbol?: string | null;

  @ApiProperty({ example: 1.0850, nullable: true })
  openPrice?: number | null;

  @ApiProperty({ example: 1.0900, nullable: true })
  closePrice?: number | null;

  @ApiProperty({ example: 1.0800, nullable: true })
  stopLoss?: number | null;

  @ApiProperty({ example: 1.0950, nullable: true })
  takeProfit?: number | null;

  @ApiProperty({ example: 209.35, nullable: true })
  profit?: number | null;

  @ApiProperty({ example: -2.50, nullable: true })
  commission?: number | null;

  @ApiProperty({ example: -0.50, nullable: true })
  swap?: number | null;

  @ApiProperty({ example: 37.84, nullable: true })
  risk?: number | null;

  @ApiProperty({ example: 2.5, nullable: true })
  riskPercent?: number | null;

  @ApiProperty({ example: 10000.00, nullable: true })
  balanceAtOpen?: number | null;

  @ApiProperty({ example: 'Trade comment', nullable: true })
  comment?: string | null;
}

export class CurrencyPairSeriesDto {
  @ApiProperty({ example: 'EURUSD' })
  label: string;

  @ApiProperty({ example: 119 })
  value: number;

  @ApiProperty({ example: 24.860024626176074 })
  percentage: number;
}

export class CurrencyPairsDto {
  @ApiProperty({ type: [CurrencyPairSeriesDto] })
  series: CurrencyPairSeriesDto[];
}

export class TradesShortLongSeriesDto {
  @ApiProperty({ example: 'Long' })
  label: string;

  @ApiProperty({ example: 30 })
  value: number;
}

export class TradesShortLongDto {
  @ApiProperty({ type: [TradesShortLongSeriesDto] })
  series: TradesShortLongSeriesDto[];
}

export class EquityBalanceSeriesDto {
  @ApiProperty({ example: 'Equity' })
  name: string;

  @ApiProperty({ type: [Number], example: [10000, 9963.37, 10017.89] })
  data: number[];

  @ApiProperty({ example: 'apexcharts-axis-0' })
  group: string;
}

export class EquityBalanceDto {
  @ApiProperty({ type: [String], example: ['2025-11-17T11:37:32.588Z', '2025-11-17T12:37:32.588Z'] })
  categories: string[];

  @ApiProperty({ type: [EquityBalanceSeriesDto] })
  series: EquityBalanceSeriesDto[];
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

export class LiveResponseDto {
  @ApiProperty({ type: MarathonLiveDto })
  marathon: MarathonLiveDto;

  @ApiProperty({ type: RiskMetricsDto })
  riskMetrics: RiskMetricsDto;

  @ApiProperty({ type: [TradeHistoryItemDto] })
  tradeHistory: TradeHistoryItemDto[];

  @ApiProperty({ type: CurrencyPairsDto })
  currencyPairs: CurrencyPairsDto;

  @ApiProperty({ type: TradesShortLongDto })
  tradesShortLong: TradesShortLongDto;

  @ApiProperty({ type: EquityBalanceDto })
  equityBalance: EquityBalanceDto;

  @ApiProperty({ type: MarathonRulesDto })
  rules: MarathonRulesDto;

  @ApiProperty({ type: UserDetailsDto, nullable: true })
  user?: UserDetailsDto | null;
}

