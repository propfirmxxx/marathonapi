import { ApiProperty } from '@nestjs/swagger';
import { MetaTraderAccountStatus } from '../entities/meta-trader-account.entity';

export class MetaTraderAccountResponseDto {
  @ApiProperty({
    description: 'Account ID',
    example: '12345678'
  })
  id: string;

  @ApiProperty({
    description: 'Account name',
    example: 'Demo Account'
  })
  name: string;

  @ApiProperty({
    description: 'Account login',
    example: '12345678'
  })
  login: string;

  @ApiProperty({
    description: 'Server name',
    example: 'MetaQuotes-Demo'
  })
  server: string;

  @ApiProperty({
    description: 'Platform type',
    example: 'mt5',
    enum: ['mt4', 'mt5']
  })
  platform: string;

  @ApiProperty({
    description: 'Account status',
    example: 'active',
    enum: MetaTraderAccountStatus
  })
  status: MetaTraderAccountStatus;

  @ApiProperty({
    description: 'Account master password',
    example: '12345678'
  })
  masterPassword: string;

  @ApiProperty({
    description: 'Account investor password',
    example: '12345678'
  })
  investorPassword: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  updatedAt: Date;
}

export class MetaTraderAccountListResponseDto {
  @ApiProperty({
    description: 'List of accounts',
    type: [MetaTraderAccountResponseDto]
  })
  items: MetaTraderAccountResponseDto[];

  @ApiProperty({
    description: 'Total number of accounts',
    example: 1
  })
  total: number;
}

export class AccountBalanceResponseDto {
  @ApiProperty({
    description: 'Account balance',
    example: 10000
  })
  balance: number;

  @ApiProperty({
    description: 'Account equity',
    example: 10500
  })
  equity: number;

  @ApiProperty({
    description: 'Account margin',
    example: 500
  })
  margin: number;

  @ApiProperty({
    description: 'Free margin',
    example: 9500
  })
  freeMargin: number;
}

export class PositionResponseDto {
  @ApiProperty({
    description: 'Position ID',
    example: '123456'
  })
  id: string;

  @ApiProperty({
    description: 'Symbol',
    example: 'EURUSD'
  })
  symbol: string;

  @ApiProperty({
    description: 'Position type',
    example: 'POSITION_TYPE_BUY',
    enum: ['POSITION_TYPE_BUY', 'POSITION_TYPE_SELL']
  })
  type: string;

  @ApiProperty({
    description: 'Volume',
    example: 0.1
  })
  volume: number;

  @ApiProperty({
    description: 'Open price',
    example: 1.08500
  })
  openPrice: number;

  @ApiProperty({
    description: 'Current price',
    example: 1.08700
  })
  currentPrice: number;

  @ApiProperty({
    description: 'Swap',
    example: 0.00
  })
  swap: number;

  @ApiProperty({
    description: 'Profit/loss',
    example: 20.00
  })
  profit: number;

  @ApiProperty({
    description: 'Position open time',
    example: '2024-04-22T12:00:00Z'
  })
  time: Date;
}

export class OrderResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123456'
  })
  id: string;

  @ApiProperty({
    description: 'Symbol',
    example: 'EURUSD'
  })
  symbol: string;

  @ApiProperty({
    description: 'Order type',
    example: 'ORDER_TYPE_BUY_LIMIT',
    enum: ['ORDER_TYPE_BUY', 'ORDER_TYPE_SELL', 'ORDER_TYPE_BUY_LIMIT', 'ORDER_TYPE_SELL_LIMIT']
  })
  type: string;

  @ApiProperty({
    description: 'Volume',
    example: 0.1
  })
  volume: number;

  @ApiProperty({
    description: 'Order price',
    example: 1.08000
  })
  price: number;

  @ApiProperty({
    description: 'Current price',
    example: 1.08500
  })
  currentPrice: number;

  @ApiProperty({
    description: 'Order time',
    example: '2024-04-22T12:00:00Z'
  })
  time: Date;

  @ApiProperty({
    description: 'Order state',
    example: 'ORDER_STATE_PLACED',
    enum: ['ORDER_STATE_PLACED', 'ORDER_STATE_CANCELED', 'ORDER_STATE_FILLED']
  })
  state: string;
}

export class HistoryResponseDto {
  @ApiProperty({
    description: 'Deal ID',
    example: '123456'
  })
  id: string;

  @ApiProperty({
    description: 'Symbol',
    example: 'EURUSD'
  })
  symbol: string;

  @ApiProperty({
    description: 'Deal type',
    example: 'DEAL_TYPE_BUY',
    enum: ['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL']
  })
  type: string;

  @ApiProperty({
    description: 'Volume',
    example: 0.1
  })
  volume: number;

  @ApiProperty({
    description: 'Price',
    example: 1.08500
  })
  price: number;

  @ApiProperty({
    description: 'Profit/loss',
    example: 20.00
  })
  profit: number;

  @ApiProperty({
    description: 'Deal time',
    example: '2024-04-22T12:00:00Z'
  })
  time: Date;
}

export class PositionListResponseDto {
  @ApiProperty({
    description: 'List of positions',
    type: [PositionResponseDto]
  })
  items: PositionResponseDto[];

  @ApiProperty({
    description: 'Total number of positions',
    example: 1
  })
  total: number;
}

export class OrderListResponseDto {
  @ApiProperty({
    description: 'List of orders',
    type: [OrderResponseDto]
  })
  items: OrderResponseDto[];

  @ApiProperty({
    description: 'Total number of orders',
    example: 1
  })
  total: number;
}

export class HistoryListResponseDto {
  @ApiProperty({
    description: 'List of history deals',
    type: [HistoryResponseDto]
  })
  items: HistoryResponseDto[];

  @ApiProperty({
    description: 'Total number of deals',
    example: 1
  })
  total: number;
} 