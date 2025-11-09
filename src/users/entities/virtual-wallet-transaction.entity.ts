import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VirtualWallet } from './virtual-wallet.entity';

export enum VirtualWalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND = 'REFUND',
}

@Entity('virtual_wallet_transactions')
@Index(['walletId', 'type', 'referenceType', 'referenceId'], {
  unique: true,
  where: '"referenceId" IS NOT NULL',
})
export class VirtualWalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VirtualWallet, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: VirtualWallet;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ type: 'enum', enum: VirtualWalletTransactionType })
  type: VirtualWalletTransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ length: 100, nullable: true })
  referenceType: string | null;

  @Column({ length: 100, nullable: true })
  referenceId: string | null;

  @Column({ length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

