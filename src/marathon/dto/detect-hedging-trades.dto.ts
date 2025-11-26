import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DetectHedgingTradesQueryDto {
  @ApiPropertyOptional({ description: 'Marathon ID to filter trades' })
  @IsOptional()
  @IsString()
  marathonId?: string;

  @ApiPropertyOptional({ description: 'Start date for trade analysis (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date for trade analysis (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ 
    description: 'Time window in minutes to consider trades as suspicious (default: 5)',
    default: 5,
    minimum: 1,
    maximum: 60
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(60)
  timeWindowMinutes?: number = 5;

  @ApiPropertyOptional({ 
    description: 'Volume similarity threshold in percentage (default: 5)',
    default: 5,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  volumeThresholdPercent?: number = 5;

  @ApiPropertyOptional({ 
    description: 'Price similarity threshold in percentage (default: 0.1)',
    default: 0.1,
    minimum: 0,
    maximum: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  priceThresholdPercent?: number = 0.1;

  @ApiPropertyOptional({ 
    description: 'Minimum volume to consider (default: 0.01)',
    default: 0.01,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minVolume?: number = 0.01;
}

export class SuspiciousTradePairDto {
  @ApiProperty({ description: 'First participant user ID' })
  participant1UserId: string;

  @ApiProperty({ description: 'First participant username' })
  participant1Username: string;

  @ApiProperty({ description: 'First participant account login' })
  participant1AccountLogin: string;

  @ApiProperty({ description: 'First trade ID' })
  trade1Id: string;

  @ApiProperty({ description: 'First trade type (BUY/SELL)' })
  trade1Type: string;

  @ApiProperty({ description: 'First trade volume' })
  trade1Volume: number;

  @ApiProperty({ description: 'First trade open price' })
  trade1OpenPrice: number;

  @ApiProperty({ description: 'First trade open time' })
  trade1OpenTime: Date;

  @ApiProperty({ description: 'Second participant user ID' })
  participant2UserId: string;

  @ApiProperty({ description: 'Second participant username' })
  participant2Username: string;

  @ApiProperty({ description: 'Second participant account login' })
  participant2AccountLogin: string;

  @ApiProperty({ description: 'Second trade ID' })
  trade2Id: string;

  @ApiProperty({ description: 'Second trade type (BUY/SELL)' })
  trade2Type: string;

  @ApiProperty({ description: 'Second trade volume' })
  trade2Volume: number;

  @ApiProperty({ description: 'Second trade open price' })
  trade2OpenPrice: number;

  @ApiProperty({ description: 'Second trade open time' })
  trade2OpenTime: Date;

  @ApiProperty({ description: 'Trading symbol' })
  symbol: string;

  @ApiProperty({ description: 'Time difference in seconds' })
  timeDifferenceSeconds: number;

  @ApiProperty({ description: 'Volume difference in percentage' })
  volumeDifferencePercent: number;

  @ApiProperty({ description: 'Price difference in percentage' })
  priceDifferencePercent: number;

  @ApiProperty({ description: 'Suspicion score (0-100)' })
  suspicionScore: number;

  @ApiProperty({ description: 'Marathon ID if applicable' })
  marathonId?: string;

  @ApiProperty({ description: 'Marathon name if applicable' })
  marathonName?: string;
}

export class DetectHedgingTradesResponseDto {
  @ApiProperty({ description: 'List of suspicious trade pairs', type: [SuspiciousTradePairDto] })
  suspiciousPairs: SuspiciousTradePairDto[];

  @ApiProperty({ description: 'Total number of suspicious pairs found' })
  totalCount: number;

  @ApiProperty({ description: 'Analysis parameters used' })
  parameters: {
    timeWindowMinutes: number;
    volumeThresholdPercent: number;
    priceThresholdPercent: number;
    minVolume: number;
    fromDate?: Date;
    toDate?: Date;
    marathonId?: string;
  };
}

