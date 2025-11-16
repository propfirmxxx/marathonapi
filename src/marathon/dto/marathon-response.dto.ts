import { ApiProperty } from '@nestjs/swagger';
import { PrizeStrategyType } from '../entities/prize-strategy.types';
import { PrizeStrategyConfigDto } from './prize-strategy.dto';
import { MetaTraderAccountStatus } from '../../metatrader-accounts/entities/meta-trader-account.entity';
import { MarathonRulesDto } from './marathon-rules.dto';
import { MarathonRule, MarathonRules } from '../enums/marathon-rule.enum';
import { MarathonStatus } from '../enums/marathon-status.enum';

export class MarathonResponseDto {
  @ApiProperty({ description: 'Indicates whether the user is a participant of the marathon', example: true })
  isParticipant: boolean;

  @ApiProperty({
    description: 'Marathon ID',
    example: '1'
  })
  id: string;

  @ApiProperty({
    description: 'Marathon name',
    example: 'Summer Trading Challenge'
  })
  name: string;

  @ApiProperty({
    description: 'Marathon description',
    example: 'A 30-day trading challenge with cash prizes'
  })
  description: string;

  @ApiProperty({
    description: 'Entry fee in USD',
    example: 100,
    minimum: 0
  })
  entryFee: number;

  @ApiProperty({
    description: 'Total awards amount in USD',
    example: 10000,
    minimum: 0
  })
  awardsAmount: number;

  @ApiProperty({
    description: 'Prize distribution strategy type',
    enum: PrizeStrategyType,
    example: PrizeStrategyType.WINNER_TAKE_ALL,
  })
  prizeStrategyType: PrizeStrategyType;

  @ApiProperty({
    description: 'Prize distribution configuration',
    type: PrizeStrategyConfigDto,
    required: false,
  })
  prizeStrategyConfig?: PrizeStrategyConfigDto | null;

  @ApiProperty({
    description: 'Maximum number of participants',
    example: 100,
    minimum: 1
  })
  maxPlayers: number;

  @ApiProperty({
    description: 'Marathon start date',
    example: '2024-06-01T00:00:00Z'
  })
  startDate: Date;

  @ApiProperty({
    description: 'Marathon end date',
    example: '2024-06-30T23:59:59Z'
  })
  endDate: Date;

  @ApiProperty({
    description: 'Current status of the marathon lifecycle',
    enum: MarathonStatus,
    example: MarathonStatus.ONGOING,
  })
  status: MarathonStatus;

  @ApiProperty({
    description: 'Marathon rules and conditions, keyed by predefined rule identifiers',
    type: () => MarathonRulesDto,
    example: {
      [MarathonRule.MIN_TRADES]: 10,
      [MarathonRule.MAX_DRAWDOWN_PERCENT]: 20,
      [MarathonRule.MIN_PROFIT_PERCENT]: 5,
    },
  })
  rules: MarathonRules;

  @ApiProperty({
    description: 'Marathon active status',
    example: true
  })
  isActive: boolean;

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

export class MarathonParticipantMetaTraderAccountDto {
  @ApiProperty({ description: 'MetaTrader account ID', example: 'account-uuid' })
  id: string;

  @ApiProperty({ description: 'MetaTrader account login', example: '12345678' })
  login: string;

  @ApiProperty({
    description: 'Investor password',
    example: 'investor123',
    required: false,
    nullable: true,
  })
  investorPassword?: string | null;

  @ApiProperty({ description: 'MetaTrader server', example: 'MetaQuotes-Demo' })
  server: string;

  @ApiProperty({ description: 'Trading platform', example: 'mt5' })
  platform: string;

  @ApiProperty({
    description: 'Deployment status',
    enum: MetaTraderAccountStatus,
    example: MetaTraderAccountStatus.DEPLOYED,
  })
  status: MetaTraderAccountStatus;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-04-22T13:00:00Z',
    required: false,
    nullable: true,
  })
  updatedAt?: Date | null;
}

export class MarathonParticipantLiveDataDto {
  @ApiProperty({ description: 'Balance reported by MetaTrader', example: 10000, required: false, nullable: true })
  balance?: number | null;

  @ApiProperty({ description: 'Equity reported by MetaTrader', example: 10500, required: false, nullable: true })
  equity?: number | null;

  @ApiProperty({ description: 'Floating profit', example: 250, required: false, nullable: true })
  profit?: number | null;

  @ApiProperty({ description: 'Used margin', example: 1500, required: false, nullable: true })
  margin?: number | null;

  @ApiProperty({ description: 'Free margin', example: 8500, required: false, nullable: true })
  freeMargin?: number | null;

  @ApiProperty({ description: 'Account currency', example: 'USD', required: false, nullable: true })
  currency?: string | null;

  @ApiProperty({
    description: 'Open positions',
    type: [Object],
    required: false,
    nullable: true,
  })
  positions?: Record<string, any>[] | null;

  @ApiProperty({
    description: 'Pending orders',
    type: [Object],
    required: false,
    nullable: true,
  })
  orders?: Record<string, any>[] | null;

  @ApiProperty({
    description: 'Timestamp of the last update pulled from MetaTrader',
    example: '2024-04-22T13:05:00Z',
    required: false,
    nullable: true,
  })
  updatedAt?: Date | null;
}

export class MarathonParticipantResponseDto {
  @ApiProperty({
    description: 'Participant ID',
    example: '1'
  })
  id: string;

  @ApiProperty({
    description: 'Marathon ID',
    example: '1'
  })
  marathonId: string;

  @ApiProperty({
    description: 'User ID',
    example: '1'
  })
  userId: string;

  @ApiProperty({
    description: 'Join timestamp',
    example: '2024-04-22T13:00:00Z'
  })
  joinedAt: Date;

  @ApiProperty({
    description: 'Participant status',
    example: 'active',
    enum: ['active', 'disqualified', 'completed']
  })
  status: string;

  @ApiProperty({
    description: 'Current account balance',
    example: 10000,
    required: false,
    nullable: true,
  })
  currentBalance?: number | null;

  @ApiProperty({
    description: 'Current profit/loss',
    example: 500,
    required: false,
    nullable: true,
  })
  profit?: number | null;

  @ApiProperty({
    description: 'Number of trades',
    example: 15,
    required: false,
    nullable: true,
  })
  trades?: number | null;

  @ApiProperty({
    description: 'Current account equity',
    example: 11000,
    required: false,
    nullable: true,
  })
  equity?: number | null;

  @ApiProperty({
    description: 'User information',
    example: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    }
  })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'MetaTrader account information (excluding master password)',
    required: false,
    nullable: true,
    type: () => MarathonParticipantMetaTraderAccountDto,
  })
  metaTraderAccount?: MarathonParticipantMetaTraderAccountDto | null;

  @ApiProperty({
    description: 'Live trading metrics received from MetaTrader',
    required: false,
    nullable: true,
    type: () => MarathonParticipantLiveDataDto,
  })
  liveData?: MarathonParticipantLiveDataDto | null;
}

export class MarathonParticipantListResponseDto {
  @ApiProperty({
    description: 'List of participants',
    type: [MarathonParticipantResponseDto],
  })
  items: MarathonParticipantResponseDto[];

  @ApiProperty({
    description: 'Total number of participants',
    example: 1,
  })
  total: number;

  @ApiProperty({
    description: 'Indicates whether the marathon has started',
    example: true,
  })
  marathonStarted: boolean;
}

export class MarathonListResponseDto {
  @ApiProperty({
    description: 'List of marathons',
    type: [MarathonResponseDto]
  })
  items: MarathonResponseDto[];

  @ApiProperty({
    description: 'Total number of marathons',
    example: 1
  })
  total: number;
}


export class PrizePayoutResponseDto {
  @ApiProperty({ description: 'Participant identifier', example: 'participant-uuid' })
  participantId: string;

  @ApiProperty({ description: 'Finishing position', example: 1 })
  position: number;

  @ApiProperty({ description: 'Prize amount awarded', example: 5000 })
  amount: number;

  @ApiProperty({ description: 'Applied percentage share of the total pool', example: 50, required: false })
  percentage?: number;
}

export class PrizeDistributionResponseDto {
  @ApiProperty({ description: 'Marathon identifier', example: 'marathon-uuid' })
  marathonId: string;

  @ApiProperty({ description: 'Calculated payouts', type: [PrizePayoutResponseDto] })
  payouts: PrizePayoutResponseDto[];

  @ApiProperty({ description: 'Total amount distributed', example: 10000 })
  totalDistributed: number;
}

export class MarathonLeaderboardEntryDto {
  @ApiProperty({ description: 'Rank in leaderboard', example: 1 })
  rank: number;

  @ApiProperty({ description: 'Participant ID', example: 'participant-uuid' })
  participantId: string;

  @ApiProperty({ description: 'User ID', example: 'user-uuid' })
  userId: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  userName: string;

  @ApiProperty({ description: 'Account login', example: '12345678' })
  accountLogin: string;

  @ApiProperty({ description: 'Profit & Loss (P&L)', example: 1500.50 })
  pnl: number;

  @ApiProperty({ description: 'Total number of trades', example: 45 })
  totalTrades: number;

  @ApiProperty({ description: 'Win rate percentage', example: 65.5 })
  winrate: number;
}

export class MarathonLeaderboardResponseDto {
  @ApiProperty({ description: 'Marathon ID', example: 'marathon-uuid' })
  marathonId: string;

  @ApiProperty({ description: 'Marathon name', example: 'Summer Trading Challenge' })
  marathonName: string;

  @ApiProperty({ description: 'Total number of participants', example: 50 })
  totalParticipants: number;

  @ApiProperty({ description: 'Leaderboard entries', type: [MarathonLeaderboardEntryDto] })
  entries: MarathonLeaderboardEntryDto[];
}