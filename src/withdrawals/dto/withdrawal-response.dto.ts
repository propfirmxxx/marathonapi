import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

class WalletInfoDto {
  @ApiProperty({ description: 'Wallet ID' })
  id: string;

  @ApiProperty({ description: 'Wallet name' })
  name: string;

  @ApiProperty({ description: 'Wallet address' })
  address: string;

  @ApiProperty({ description: 'Network' })
  network: string;

  @ApiProperty({ description: 'Currency', required: false })
  currency?: string;
}

export class WithdrawalResponseDto {
  @ApiProperty({ description: 'Withdrawal ID' })
  id: string;

  @ApiProperty({ description: 'Withdrawal amount in USD' })
  amount: number;

  @ApiProperty({ description: 'Withdrawal status', enum: WithdrawalStatus })
  status: WithdrawalStatus;

  @ApiProperty({ description: 'Transaction hash', required: false })
  transactionHash: string | null;

  @ApiProperty({ description: 'Description or rejection reason', required: false })
  description: string | null;

  @ApiProperty({ description: 'Internal transaction number' })
  transactionNumber: string;

  @ApiProperty({ description: 'Wallet information', type: WalletInfoDto })
  wallet: WalletInfoDto;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Processed date', required: false })
  processedAt: Date | null;
}

