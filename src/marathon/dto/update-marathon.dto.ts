import { IsString, IsNumber, IsDate, IsBoolean, IsObject, Min, IsNotEmpty, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PrizeStrategyType } from '../entities/prize-strategy.types';
import { PrizeStrategyConfigDto } from './prize-strategy.dto';

export class UpdateMarathonDto {
  @ApiProperty({ description: 'Marathon name', example: 'Summer Trading Challenge', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Marathon description', example: 'A 30-day trading challenge with cash prizes', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Entry fee in USD', example: 100, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  entryFee?: number;

  @ApiProperty({ description: 'Total awards amount in USD', example: 10000, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  awardsAmount?: number;

  @ApiProperty({ description: 'Maximum number of participants', example: 100, minimum: 1, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPlayers?: number;

  @ApiProperty({
    description: 'Prize distribution strategy type',
    enum: PrizeStrategyType,
    required: false,
  })
  @IsEnum(PrizeStrategyType)
  @IsOptional()
  prizeStrategyType?: PrizeStrategyType;

  @ApiProperty({
    description: 'Configuration options for the selected prize strategy',
    type: PrizeStrategyConfigDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => PrizeStrategyConfigDto)
  @IsOptional()
  prizeStrategyConfig?: PrizeStrategyConfigDto;

  @ApiProperty({ description: 'Marathon start date', example: '2024-06-01T00:00:00Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: 'Marathon end date', example: '2024-06-30T23:59:59Z', required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ 
    description: 'Marathon rules and conditions',
    example: {
      minTrades: 10,
      maxDrawdown: 20,
      minProfit: 5
    },
    required: false
  })
  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;

  @ApiProperty({ description: 'Marathon active status', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 