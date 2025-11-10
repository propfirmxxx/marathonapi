import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

export class GetWithdrawalsDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by withdrawal status',
    enum: WithdrawalStatus,
    example: WithdrawalStatus.UNDER_REVIEW,
    required: false,
  })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiProperty({
    description: 'Search by transaction number or description',
    example: 'WD-2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

