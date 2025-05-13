import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'User nickname' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: 'User nationality' })
  @IsString()
  @IsOptional()
  nationality?: string;
} 