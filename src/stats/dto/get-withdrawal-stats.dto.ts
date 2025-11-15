import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum GroupByPeriod {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class GetWithdrawalStatsDto {
  @ApiProperty({
    description: 'Start date for the statistics period',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for the statistics period',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Group data by period',
    enum: GroupByPeriod,
    example: GroupByPeriod.MONTH,
    required: false,
    default: GroupByPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(GroupByPeriod)
  groupBy?: GroupByPeriod = GroupByPeriod.MONTH;
}

