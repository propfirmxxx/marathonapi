import { ApiProperty } from '@nestjs/swagger';
import { MetaTraderAccountStatus } from '../entities/meta-trader-account.entity';

export class MetaTraderAccountResponseDto {
  @ApiProperty({ description: 'Account ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Account name', example: 'Demo Account 1' })
  name: string;

  @ApiProperty({ description: 'MT account login', example: '12345678' })
  login: string;

  @ApiProperty({ description: 'MT server', example: 'MetaQuotes-Demo' })
  server: string;

  @ApiProperty({ description: 'Platform type', example: 'mt5' })
  platform: string;

  @ApiProperty({ 
    description: 'Account status',
    enum: MetaTraderAccountStatus,
    example: MetaTraderAccountStatus.UNDEPLOYED
  })
  status: MetaTraderAccountStatus;

  @ApiProperty({ description: 'User ID (if assigned to user)', example: 'uuid', nullable: true })
  userId: string | null;

  @ApiProperty({ description: 'Marathon participant ID (if assigned)', example: 'uuid', nullable: true })
  marathonParticipantId: string | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class MetaTraderAccountListResponseDto {
  @ApiProperty({ 
    description: 'List of MetaTrader accounts',
    type: [MetaTraderAccountResponseDto]
  })
  accounts: MetaTraderAccountResponseDto[];
}

