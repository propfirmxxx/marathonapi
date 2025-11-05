import { IsNumber, IsPositive, IsNotEmpty, Min, Max, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletChargeDto {
  @ApiProperty({
    description: 'Amount to charge the wallet',
    example: 100.50,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Min(1)
  @Max(10000)
  amount: number;

  @ApiProperty({
    description: 'Currency code (default: usdttrc20)',
    example: 'usdttrc20',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
