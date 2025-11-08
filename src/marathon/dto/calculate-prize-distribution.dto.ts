import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrizeResultInputDto {
  @ApiProperty({ description: 'Participant identifier', example: 'participant-uuid' })
  @IsString()
  participantId: string;

  @ApiProperty({ description: 'Placement position', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  position: number;

  @ApiProperty({ description: 'Optional score or metric for reference', example: 95.5, required: false })
  @IsOptional()
  @IsNumber()
  score?: number;
}
