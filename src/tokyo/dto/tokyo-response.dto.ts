import { ApiProperty } from '@nestjs/swagger';

export class AccountDeploymentResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Human-readable deployment status message',
    example: 'Account deployed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Path to the account configuration file on the host',
    example: '/path/to/config.ini',
    nullable: true,
    required: false,
  })
  config_path?: string | null;

  @ApiProperty({
    description: 'Latest data payload received from the socket server, if available',
    nullable: true,
    required: false,
  })
  data_preview?: any | null;
}

export class MessageResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Human-readable status message',
    example: 'Operation completed successfully',
  })
  message: string;
}

export class LatestDataResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'empty'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Optional message if no data available',
    example: 'No data available',
    nullable: true,
    required: false,
  })
  message?: string | null;

  @ApiProperty({
    description: 'Latest payload data, if available',
    nullable: true,
    required: false,
  })
  data?: any | null;
}

export class AccountListResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'List of active account logins',
    example: ['261632689', '261632690'],
    type: [String],
  })
  accounts: string[];

  @ApiProperty({
    description: 'Total number of active accounts',
    example: 2,
    default: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Optional message',
    nullable: true,
    required: false,
  })
  message?: string | null;
}

export class AccountDataResponseDto {
  @ApiProperty({
    description: "Status: 'success', 'not_found', or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'Account data',
    nullable: true,
    required: false,
  })
  data?: any | null;

  @ApiProperty({
    description: 'Error message if applicable',
    nullable: true,
    required: false,
  })
  message?: string | null;

  @ApiProperty({
    description: 'Timestamp when data was cached',
    nullable: true,
    required: false,
  })
  cached_at?: number | null;
}

export class PositionsResponseDto {
  @ApiProperty({
    description: "Status: 'success', 'not_found', or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'List of open positions',
    type: [Object],
  })
  positions: any[];

  @ApiProperty({
    description: 'Total number of positions',
    example: 2,
    default: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Error message if applicable',
    nullable: true,
    required: false,
  })
  message?: string | null;
}

export class OrdersResponseDto {
  @ApiProperty({
    description: "Status: 'success', 'not_found', or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'List of pending orders',
    type: [Object],
  })
  orders: any[];

  @ApiProperty({
    description: 'Total number of orders',
    example: 1,
    default: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Error message if applicable',
    nullable: true,
    required: false,
  })
  message?: string | null;
}

// ==================== MT5 Query Response Models ====================

export class MT5ResponseDto {
  @ApiProperty({
    description: "Response type, typically 'response'",
    example: 'response',
  })
  type: string;

  @ApiProperty({
    description: 'Whether the query was successful',
    example: true,
  })
  ok: boolean;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'Request ID for tracking',
    nullable: true,
    required: false,
  })
  requestId?: string | null;

  @ApiProperty({
    description: 'Response timestamp',
    nullable: true,
    required: false,
  })
  timestamp?: string | null;

  @ApiProperty({
    description: 'Error message if ok is false',
    nullable: true,
    required: false,
  })
  error?: string | null;

  @ApiProperty({
    description: 'Response data, structure varies by endpoint',
    nullable: true,
    required: false,
  })
  data?: any | null;
}

export class RateBarDto {
  @ApiProperty({ description: 'Bar time (Unix timestamp)', example: 1700000000 })
  time: number;

  @ApiProperty({ description: 'Open price', example: 2000.50 })
  open: number;

  @ApiProperty({ description: 'High price', example: 2010.75 })
  high: number;

  @ApiProperty({ description: 'Low price', example: 1995.25 })
  low: number;

  @ApiProperty({ description: 'Close price', example: 2005.00 })
  close: number;

  @ApiProperty({ description: 'Tick volume', nullable: true, required: false })
  tick_volume?: number | null;

  @ApiProperty({ description: 'Spread in points', nullable: true, required: false })
  spread?: number | null;

  @ApiProperty({ description: 'Real volume', nullable: true, required: false })
  real_volume?: number | null;
}

export class HistoryRatesResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of OHLCV rate bars',
    type: [RateBarDto],
    nullable: true,
    required: false,
  })
  data?: RateBarDto[] | null;
}

export class TickDataDto {
  @ApiProperty({ description: 'Tick time (Unix timestamp)', example: 1700000000 })
  time: number;

  @ApiProperty({ description: 'Bid price', example: 2000.50 })
  bid: number;

  @ApiProperty({ description: 'Ask price', example: 2000.55 })
  ask: number;

  @ApiProperty({ description: 'Last price', example: 2000.52 })
  last: number;

  @ApiProperty({ description: 'Volume', nullable: true, required: false })
  volume?: number | null;

  @ApiProperty({ description: 'Tick flags', nullable: true, required: false })
  flags?: number | null;
}

export class HistoryTicksResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of tick data',
    type: [TickDataDto],
    nullable: true,
    required: false,
  })
  data?: TickDataDto[] | null;
}

export class BalanceEventDto {
  @ApiProperty({ description: 'Event time (Unix timestamp)', example: 1700000000 })
  time: number;

  @ApiProperty({ description: 'Deal ticket', example: 123456789 })
  ticket: number;

  @ApiProperty({ description: 'Deal type', example: 2 })
  type: number;

  @ApiProperty({ description: 'Balance change amount', example: 100.50 })
  delta: number;

  @ApiProperty({ description: 'Balance after this event', example: 5000.00 })
  balance: number;

  @ApiProperty({ description: 'Event comment', nullable: true, required: false })
  comment?: string | null;
}

export class BalanceHistoryResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of balance events',
    type: [BalanceEventDto],
    nullable: true,
    required: false,
  })
  data?: BalanceEventDto[] | null;
}

export class EquityPointDto {
  @ApiProperty({ description: 'Point time (Unix timestamp)', example: 1700000000 })
  time: number;

  @ApiProperty({ description: 'Equity value at this time', example: 5000.00 })
  equity: number;
}

export class EquityHistoryResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of equity points',
    type: [EquityPointDto],
    nullable: true,
    required: false,
  })
  data?: EquityPointDto[] | null;
}

export class PerformanceReportDto {
  @ApiProperty({ description: 'Current balance', example: 9545.04 })
  balance: number;

  @ApiProperty({ description: 'Current equity', example: 9031.66 })
  equity: number;

  @ApiProperty({ description: 'Current floating profit', example: -513.38 })
  profit: number;

  @ApiProperty({ description: 'Current margin', example: 40.92 })
  margin: number;

  @ApiProperty({ description: 'Current free margin', example: 8990.74 })
  free_margin: number;

  @ApiProperty({ description: 'Current margin level percentage', example: 22071.51 })
  margin_level: number;

  @ApiProperty({ description: 'Credit facility', example: 0.0 })
  credit_facility: number;

  @ApiProperty({ description: 'Total net profit', example: -454.96 })
  total_net_profit: number;

  @ApiProperty({ description: 'Gross profit', example: 2066.02 })
  gross_profit: number;

  @ApiProperty({ description: 'Gross loss', example: -2520.98 })
  gross_loss: number;

  @ApiProperty({ description: 'Profit factor', example: 0.82 })
  profit_factor: number;

  @ApiProperty({ description: 'Expected payoff per trade', example: -56.87 })
  expected_payoff: number;

  @ApiProperty({ description: 'Recovery factor', example: -0.18 })
  recovery_factor: number;

  @ApiProperty({ description: 'Sharpe ratio', example: -0.0 })
  sharpe_ratio: number;

  @ApiProperty({ description: 'Absolute drawdown', example: 2520.40 })
  balance_drawdown_absolute: number;

  @ApiProperty({ description: 'Maximal drawdown', example: 2520.98 })
  balance_drawdown_maximal: number;

  @ApiProperty({ description: 'Relative drawdown percentage', example: 25.21 })
  balance_drawdown_relative_percent: number;

  @ApiProperty({ description: 'Total number of trades', example: 8 })
  total_trades: number;

  @ApiProperty({ description: 'Number of profitable trades', example: 2 })
  profit_trades: number;

  @ApiProperty({ description: 'Number of losing trades', example: 6 })
  loss_trades: number;

  @ApiProperty({ description: 'Largest profit trade', example: 2065.44 })
  largest_profit_trade: number;

  @ApiProperty({ description: 'Largest loss trade', example: -908.94 })
  largest_loss_trade: number;

  @ApiProperty({ description: 'Average profit per winning trade', example: 1033.01 })
  average_profit_trade: number;

  @ApiProperty({ description: 'Average loss per losing trade', example: -420.16 })
  average_loss_trade: number;

  @ApiProperty({ description: 'Maximum consecutive wins', example: 1 })
  max_consecutive_wins: number;

  @ApiProperty({ description: 'Profit from max consecutive wins', example: 2065.44 })
  max_consecutive_wins_profit: number;

  @ApiProperty({ description: 'Maximum consecutive losses', example: 6 })
  max_consecutive_losses: number;

  @ApiProperty({ description: 'Loss from max consecutive losses', example: -2520.98 })
  max_consecutive_losses_loss: number;

  @ApiProperty({ description: 'Average consecutive wins', example: 1.0 })
  average_consecutive_wins: number;

  @ApiProperty({ description: 'Average consecutive losses', example: 6.0 })
  average_consecutive_losses: number;
}

export class PerformanceReportResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Performance report data',
    type: PerformanceReportDto,
    nullable: true,
    required: false,
  })
  data?: PerformanceReportDto | null;
}

export class StatementOrderDto {
  @ApiProperty({ description: 'Order ticket', example: 123456789 })
  ticket: number;

  @ApiProperty({ description: 'Symbol', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Order type', example: 0 })
  type: number;

  @ApiProperty({ description: 'Setup time', example: 1700000000 })
  time_setup: number;

  @ApiProperty({ description: 'Open price', example: 2000.50 })
  price_open: number;

  @ApiProperty({ description: 'Initial volume', example: 0.1 })
  volume_initial: number;

  @ApiProperty({ description: 'Current volume', example: 0.1 })
  volume_current: number;
}

export class StatementDealDto {
  @ApiProperty({ description: 'Deal ticket', example: 123456789 })
  ticket: number;

  @ApiProperty({ description: 'Deal time', example: 1700000000 })
  time: number;

  @ApiProperty({ description: 'Deal type', example: 0 })
  type: number;

  @ApiProperty({ description: 'Entry type', example: 0 })
  entry: number;

  @ApiProperty({ description: 'Symbol', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Price', example: 2000.50 })
  price: number;

  @ApiProperty({ description: 'Volume', example: 0.1 })
  volume: number;

  @ApiProperty({ description: 'Profit', example: 100.50 })
  profit: number;

  @ApiProperty({ description: 'Comment', nullable: true, required: false })
  comment?: string | null;
}

export class StatementDataDto {
  @ApiProperty({ description: 'Account information', type: Object })
  account: Record<string, any>;

  @ApiProperty({ description: 'Period (from, to)', type: Object })
  period: { from: number; to: number };

  @ApiProperty({ description: 'Orders history', type: [StatementOrderDto] })
  orders: StatementOrderDto[];

  @ApiProperty({ description: 'Deals history', type: [StatementDealDto] })
  deals: StatementDealDto[];

  @ApiProperty({ description: 'Summary statistics', type: Object })
  summary: Record<string, number>;
}

export class StatementResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Statement data',
    type: StatementDataDto,
    nullable: true,
    required: false,
  })
  data?: StatementDataDto | null;
}

export class TradeHistoryItemDto {
  @ApiProperty({ description: 'Trade open time (Unix timestamp)', example: 1700000000 })
  open_time: number;

  @ApiProperty({ description: 'Trade close time (Unix timestamp)', example: 1700001000 })
  close_time: number;

  @ApiProperty({ description: 'Trade type: BUY or SELL', example: 'BUY' })
  type: string;

  @ApiProperty({ description: 'Trade volume', example: 0.1 })
  volume: number;

  @ApiProperty({ description: 'Trading symbol', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Entry price', example: 2000.50 })
  open_price: number;

  @ApiProperty({ description: 'Exit price', example: 2010.75 })
  close_price: number;

  @ApiProperty({ description: 'Total commission', example: -2.50 })
  commission: number;

  @ApiProperty({ description: 'Total swap', example: -1.00 })
  swap: number;

  @ApiProperty({ description: 'Total profit', example: 102.50 })
  profit: number;

  @ApiProperty({ description: 'Risk amount', example: 55.00 })
  risk: number;

  @ApiProperty({ description: 'Risk as percentage of balance', example: 1.1 })
  risk_percent: number;

  @ApiProperty({ description: 'Balance when trade was opened', example: 5000.00 })
  balance_at_open: number;
}

export class TradeHistoryResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of trade history items',
    type: [TradeHistoryItemDto],
    nullable: true,
    required: false,
  })
  data?: TradeHistoryItemDto[] | null;
}

export class SymbolStatisticsDto {
  @ApiProperty({ description: 'Trading symbol', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Total number of trades', example: 15 })
  total_trades: number;

  @ApiProperty({ description: 'Number of profitable trades', example: 8 })
  profit_trades: number;

  @ApiProperty({ description: 'Number of losing trades', example: 7 })
  loss_trades: number;

  @ApiProperty({ description: 'Win rate percentage', example: 53.33 })
  win_rate: number;

  @ApiProperty({ description: 'Total profit (same as net_profit)', example: 1250.50 })
  total_profit: number;

  @ApiProperty({ description: 'Gross profit', example: 2500.00 })
  gross_profit: number;

  @ApiProperty({ description: 'Gross loss', example: -1249.50 })
  gross_loss: number;

  @ApiProperty({ description: 'Net profit', example: 1250.50 })
  net_profit: number;

  @ApiProperty({ description: 'Profit factor', example: 2.0 })
  profit_factor: number;

  @ApiProperty({ description: 'Total commission', example: -15.00 })
  total_commission: number;

  @ApiProperty({ description: 'Total swap', example: -5.00 })
  total_swap: number;

  @ApiProperty({ description: 'Total risk', example: 550.00 })
  total_risk: number;

  @ApiProperty({ description: 'Average risk percentage', example: 1.1 })
  average_risk_percent: number;

  @ApiProperty({ description: 'Largest profit trade', example: 500.00 })
  largest_profit: number;

  @ApiProperty({ description: 'Largest loss trade', example: -200.00 })
  largest_loss: number;

  @ApiProperty({ description: 'Average profit per winning trade', example: 312.50 })
  average_profit: number;

  @ApiProperty({ description: 'Average loss per losing trade', example: -178.50 })
  average_loss: number;
}

export class SymbolStatisticsResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of symbol statistics',
    type: [SymbolStatisticsDto],
    nullable: true,
    required: false,
  })
  data?: SymbolStatisticsDto[] | null;
}

export class MinimalTradeDataDto {
  @ApiProperty({ description: 'Position ID', example: 123456789 })
  position_id: number;

  @ApiProperty({ description: 'Order ticket', example: 987654321 })
  order_ticket: number;

  @ApiProperty({ description: 'Trade open time (Unix timestamp)', example: 1700000000 })
  open_time: number;

  @ApiProperty({ description: 'Trade close time (Unix timestamp)', example: 1700001000 })
  close_time: number;

  @ApiProperty({ description: 'Entry price', example: 2000.50 })
  open_price: number;

  @ApiProperty({ description: 'Exit price', example: 2010.75 })
  close_price: number;

  @ApiProperty({ description: 'Stop loss price', example: 1995.00 })
  stop_loss: number;

  @ApiProperty({ description: 'Take profit price', example: 2020.00 })
  take_profit: number;

  @ApiProperty({ description: 'Trading symbol', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Trade type: BUY or SELL', example: 'BUY' })
  type: string;

  @ApiProperty({ description: 'Trade volume', example: 0.1 })
  volume: number;

  @ApiProperty({ description: 'Profit', example: 102.50 })
  profit: number;

  @ApiProperty({ description: 'Commission', example: -2.50 })
  commission: number;

  @ApiProperty({ description: 'Swap', example: -1.00 })
  swap: number;

  @ApiProperty({ description: 'Risk amount', example: 55.00 })
  risk: number;

  @ApiProperty({ description: 'Risk as percentage of balance', example: 1.1 })
  risk_percent: number;

  @ApiProperty({ description: 'Balance when trade was opened', example: 5000.00 })
  balance_at_open: number;

  @ApiProperty({ description: 'Trade comment', example: 'Manual trade' })
  comment: string;

  @ApiProperty({ description: 'Day of week (0=Sunday, 1=Monday, etc.)', example: 1 })
  day_of_week: number;

  @ApiProperty({ description: 'Hour of day (0-23)', example: 14 })
  hour_of_day: number;

  @ApiProperty({ description: 'Month (1-12)', example: 11 })
  month: number;
}

export class MinimalTradesResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Array of minimal trade data',
    type: [MinimalTradeDataDto],
    nullable: true,
    required: false,
  })
  data?: MinimalTradeDataDto[] | null;
}

export class SymbolInfoDto {
  @ApiProperty({ description: 'Symbol name', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Number of decimal digits', example: 2 })
  digits: number;

  @ApiProperty({ description: 'Point value', example: 0.01 })
  point: number;

  @ApiProperty({ description: 'Trade mode', example: 4 })
  trade_mode: number;

  @ApiProperty({ description: 'Spread in points', example: 30 })
  spread: number;
}

export class SymbolInfoResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Symbol information',
    type: SymbolInfoDto,
    nullable: true,
    required: false,
  })
  data?: SymbolInfoDto | null;
}

export class SymbolTickDto {
  @ApiProperty({ description: 'Symbol name', example: 'XAUUSDm' })
  symbol: string;

  @ApiProperty({ description: 'Bid price', example: 2000.50 })
  bid: number;

  @ApiProperty({ description: 'Ask price', example: 2000.55 })
  ask: number;

  @ApiProperty({ description: 'Last price', example: 2000.52 })
  last: number;

  @ApiProperty({ description: 'Volume', nullable: true, required: false })
  volume?: number | null;

  @ApiProperty({ description: 'Tick time (Unix timestamp)', example: 1700000000 })
  time: number;
}

export class SymbolTickResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Symbol tick data',
    type: SymbolTickDto,
    nullable: true,
    required: false,
  })
  data?: SymbolTickDto | null;
}

export class PongDataDto {
  @ApiProperty({ description: "Response message, typically 'pong'", example: 'pong' })
  message: string;

  @ApiProperty({ description: 'EA timestamp', example: '2024-01-01 12:00:00' })
  ea_time: string;
}

export class PingResponseDto extends MT5ResponseDto {
  @ApiProperty({
    description: 'Pong data',
    type: PongDataDto,
    nullable: true,
    required: false,
  })
  data?: PongDataDto | null;
}

export class DebugConnectionsResponseDto {
  @ApiProperty({ description: 'Status', example: 'success' })
  status: string;

  @ApiProperty({
    description: 'List of mapped logins',
    type: [String],
    example: ['261632689', '261632690'],
  })
  mapped_logins: string[];

  @ApiProperty({ description: 'Count of mapped logins', example: 2 })
  count: number;

  @ApiProperty({ description: 'Error message if applicable', nullable: true, required: false })
  error?: string | null;
}

