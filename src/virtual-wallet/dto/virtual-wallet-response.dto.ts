import { ApiProperty } from '@nestjs/swagger';
import { VirtualWalletTransactionType } from '../entities/virtual-wallet-transaction.entity';

export class VirtualWalletResponseDto {
  @ApiProperty({ description: 'Virtual wallet ID' })
  id: string;

  @ApiProperty({ description: 'Current wallet balance', example: 0 })
  balance: number;

  @ApiProperty({ description: 'Wallet currency', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class VirtualWalletBalanceResponseDto {
  @ApiProperty({ description: 'Current wallet balance', example: 0 })
  balance: number;
}

export class VirtualWalletTransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ enum: VirtualWalletTransactionType, description: 'Transaction type' })
  type: VirtualWalletTransactionType;

  @ApiProperty({ description: 'Transaction amount', example: 100.0 })
  amount: number;

  @ApiProperty({ description: 'Balance before transaction', example: 200.0 })
  balanceBefore: number;

  @ApiProperty({ description: 'Balance after transaction', example: 100.0 })
  balanceAfter: number;

  @ApiProperty({ description: 'Reference type', nullable: true, example: 'marathon_participation' })
  referenceType: string | null;

  @ApiProperty({ description: 'Reference identifier', nullable: true })
  referenceId: string | null;

  @ApiProperty({ description: 'Transaction description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Additional metadata', nullable: true, type: Object })
  metadata: Record<string, any> | null;

  @ApiProperty({ description: 'Transaction timestamp' })
  createdAt: Date;
}

