import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum AnalysisSection {
  PERFORMANCE = 'performance',
  DRAWDOWN = 'drawdown',
  FLOATING_RISK = 'floatingRisk',
  EQUITY_BALANCE_HISTORY = 'equityBalanceHistory',
  STATS_PER_SYMBOL = 'statsPerSymbol',
  TRADE_HISTORY = 'tradeHistory',
  OPEN_POSITIONS = 'openPositions',
  OPEN_ORDERS = 'openOrders',
}

export enum TradeHistorySortBy {
  OPEN_TIME_DESC = 'openTime_desc',
  OPEN_TIME_ASC = 'openTime_asc',
  CLOSE_TIME_DESC = 'closeTime_desc',
  CLOSE_TIME_ASC = 'closeTime_asc',
  PROFIT_DESC = 'profit_desc',
  PROFIT_ASC = 'profit_asc',
}

export enum HistoryResolution {
  RAW = 'raw',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export class ParticipantAnalysisQueryDto {
  @ApiProperty({
    description: 'Start date for analysis (ISO string)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    description: 'End date for analysis (ISO string)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({
    description: 'Sections to include in response (comma-separated). If not specified, all sections are included.',
    required: false,
    example: 'performance,tradeHistory,openPositions',
    enum: AnalysisSection,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim());
    }
    return value;
  })
  sections?: string[];

  @ApiProperty({
    description: 'Maximum number of trades to return in trade history',
    required: false,
    example: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  tradeHistoryLimit?: number;

  @ApiProperty({
    description: 'Sort order for trade history',
    required: false,
    enum: TradeHistorySortBy,
    example: TradeHistorySortBy.OPEN_TIME_DESC,
  })
  @IsOptional()
  @IsEnum(TradeHistorySortBy)
  tradeHistorySortBy?: TradeHistorySortBy;

  @ApiProperty({
    description: 'Filter trade history by specific symbols (comma-separated)',
    required: false,
    example: 'EURUSD,GBPUSD',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim().toUpperCase());
    }
    return value;
  })
  tradeSymbols?: string[];

  @ApiProperty({
    description: 'Maximum number of history points to return',
    required: false,
    example: 100,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  historyLimit?: number;

  @ApiProperty({
    description: 'Resolution for equity/balance history aggregation',
    required: false,
    enum: HistoryResolution,
    example: HistoryResolution.DAILY,
  })
  @IsOptional()
  @IsEnum(HistoryResolution)
  historyResolution?: HistoryResolution;

  @ApiProperty({
    description: 'Include only profitable trades in trade history',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  @IsBoolean()
  onlyProfitableTrades?: boolean;

  @ApiProperty({
    description: 'Include only losing trades in trade history',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  @IsBoolean()
  onlyLosingTrades?: boolean;

  @ApiProperty({
    description: 'Minimum profit filter for trades',
    required: false,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  minProfit?: number;

  @ApiProperty({
    description: 'Maximum profit filter for trades (useful for filtering losses)',
    required: false,
    example: -10,
  })
  @IsOptional()
  @Type(() => Number)
  maxProfit?: number;

  @ApiProperty({
    description: 'Maximum number of symbols to return in stats per symbol',
    required: false,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  topSymbolsLimit?: number;

  @ApiProperty({
    description: 'Include detailed position information in open positions',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  @IsBoolean()
  includeDetailedPositions?: boolean;
}

