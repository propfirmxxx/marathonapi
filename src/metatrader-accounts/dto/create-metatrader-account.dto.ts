import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MetaTraderAccountStatus } from '../entities/meta-trader-account.entity';

export class CreateMetaTraderAccountDto {
  @ApiProperty({ description: 'Account name', example: 'Demo Account 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'MT account login', example: '12345678' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ description: 'Master password', example: 'password123', required: false })
  @IsString()
  @IsOptional()
  masterPassword?: string;

  @ApiProperty({ description: 'Investor password', example: 'password123', required: false })
  @IsString()
  @IsOptional()
  investorPassword?: string;

  @ApiProperty({ description: 'MT server', example: 'MetaQuotes-Demo' })
  @IsString()
  @IsNotEmpty()
  server: string;

  @ApiProperty({ description: 'Platform type', example: 'mt5', default: 'mt5', required: false })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiProperty({ 
    description: 'Account status',
    enum: MetaTraderAccountStatus,
    default: MetaTraderAccountStatus.UNDEPLOYED,
    required: false
  })
  @IsEnum(MetaTraderAccountStatus)
  @IsOptional()
  status?: MetaTraderAccountStatus;
}

