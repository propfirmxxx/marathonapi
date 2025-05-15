import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'User nickname' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: 'User nationality' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ description: 'User about' })
  @IsString()
  @IsOptional()
  about?: string;
} 