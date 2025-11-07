import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PrizeStrategyType } from '../entities/prize-strategy.types';
import { ValidatePrizeStrategyConfig } from '../validators/prize-strategy-config.validator';

export class PrizePlacementDto {
  @ApiProperty({ description: 'Placement position (1 = first place)', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  position: number;

  @ApiProperty({
    description: 'Percentage of the total prize pool awarded to this placement',
    example: 60,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;
}

export class PrizeStrategyConfigDto {
  @ApiProperty({
    description: 'Prize placements configuration ordered by finishing position',
    type: [PrizePlacementDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizePlacementDto)
  placements?: PrizePlacementDto[];

}

export class PrizeStrategyDto {
  @ApiProperty({
    description: 'Prize distribution strategy type',
    enum: PrizeStrategyType,
    example: PrizeStrategyType.WINNER_TAKE_ALL,
  })
  @IsNotEmpty()
  @IsIn(Object.values(PrizeStrategyType))
  type: PrizeStrategyType;

  @ApiProperty({
    description: 'Configuration for the chosen prize strategy',
    type: PrizeStrategyConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrizeStrategyConfigDto)
  @ValidatePrizeStrategyConfig()
  config?: PrizeStrategyConfigDto;
}

