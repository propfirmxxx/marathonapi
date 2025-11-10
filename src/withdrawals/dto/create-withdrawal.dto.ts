import { IsNumber, IsUUID, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Amount to withdraw in USD',
    example: 100.50,
    minimum: 10,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(10)
  amount: number;

  @ApiProperty({
    description: 'ID of the wallet to receive the withdrawal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  walletId: string;
}

