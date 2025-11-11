import { VirtualWalletTransactionType } from '../entities/virtual-wallet-transaction.entity';

export interface WalletAdjustmentMetadata {
  [key: string]: unknown;
}

export interface WalletAdjustmentOptions {
  userId: string;
  amount: number;
  type: VirtualWalletTransactionType;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: WalletAdjustmentMetadata;
}

