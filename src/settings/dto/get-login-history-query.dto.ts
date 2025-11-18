import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LoginStatus, LoginMethod } from '../entities/login-history.entity';

export class GetLoginHistoryQueryDto {
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
    description: 'Filter by login status',
    enum: LoginStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(LoginStatus)
  status?: LoginStatus;

  @ApiProperty({
    description: 'Filter by login method',
    enum: LoginMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(LoginMethod)
  method?: LoginMethod;
}

