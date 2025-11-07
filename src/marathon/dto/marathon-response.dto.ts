import { ApiProperty } from '@nestjs/swagger';
import { PrizeStrategyType } from '../entities/prize-strategy.types';
import { PrizeStrategyConfigDto } from './prize-strategy.dto';

export class MarathonResponseDto {
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
    description: 'Marathon rules and conditions',
    example: {
      minTrades: 10,
      maxDrawdown: 20,
      minProfit: 5
    }
  })
  rules: {
    minTrades: number;
    maxDrawdown: number;
    minProfit: number;
  };

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
    example: 10000
  })
  currentBalance: number;

  @ApiProperty({
    description: 'Current profit/loss',
    example: 500
  })
  profit: number;

  @ApiProperty({
    description: 'Number of trades',
    example: 15
  })
  trades: number;

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

export class MarathonParticipantListResponseDto {
  @ApiProperty({
    description: 'List of participants',
    type: [MarathonParticipantResponseDto]
  })
  items: MarathonParticipantResponseDto[];

  @ApiProperty({
    description: 'Total number of participants',
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