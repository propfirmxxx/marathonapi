import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({ description: 'Wallet name', example: 'My Bitcoin Wallet' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Wallet address', example: '0x123...abc' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Network name', example: 'Ethereum' })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiProperty({ description: 'Currency code', example: 'BTC', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class UpdateWalletDto {
  @ApiProperty({ description: 'Wallet name', example: 'My Bitcoin Wallet', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Wallet address', example: '0x123...abc', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Network name', example: 'Ethereum', required: false })
  @IsString()
  @IsOptional()
  network?: string;

  @ApiProperty({ description: 'Currency code', example: 'BTC', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class WalletResponseDto {
  @ApiProperty({ description: 'Wallet ID' })
  id: string;

  @ApiProperty({ description: 'Wallet name' })
  name: string;

  @ApiProperty({ description: 'Wallet address' })
  address: string;

  @ApiProperty({ description: 'Network name' })
  network: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Wallet active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 