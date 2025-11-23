import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BanReason } from '../entities/user.entity';

export class BanUserDto {
  @ApiProperty({
    description: 'Reason for banning the user',
    enum: BanReason,
    required: false,
    example: BanReason.VIOLATION_OF_TERMS
  })
  @IsOptional()
  @IsEnum(BanReason)
  banReason?: BanReason;

  @ApiProperty({
    description: 'Ban expiration date. If not provided, ban is permanent',
    required: false,
    example: '2024-12-31T23:59:59Z',
    nullable: true
  })
  @IsOptional()
  @IsDateString()
  bannedUntil?: Date | null;
}

