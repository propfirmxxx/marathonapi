import { IsString, IsNotEmpty, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: 'Account name', example: 'My Trading Account' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'MetaTrader account login', example: '12345678' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ description: 'MetaTrader account master password', example: 'password123' })
  @IsString()
  @ValidateIf((o) => !o.investorPassword)
  @IsNotEmpty()
  masterPassword: string;

  @ApiProperty({ description: 'MetaTrader account investor password', example: 'password123' })
  @IsString()
  @ValidateIf((o) => !o.masterPassword)
  @IsNotEmpty()
  investorPassword: string;

  @ApiProperty({ description: 'MetaTrader server name', example: 'ICMarkets-Demo' })
  @IsString()
  @IsNotEmpty()
  server: string;
} 