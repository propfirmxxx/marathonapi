import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../users/entities/wallet.entity';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

@Entity('withdrawals')
@Index(['userId', 'status', 'createdAt'])
@Index(['status'])
@Index(['transactionNumber'])
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.UNDER_REVIEW,
  })
  status: WithdrawalStatus;

  @Column({ name: 'transaction_hash', type: 'varchar', length: 255, nullable: true })
  transactionHash: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'transaction_number', type: 'varchar', length: 50, unique: true })
  transactionNumber: string;

  @Column({ name: 'virtual_wallet_transaction_id', type: 'uuid', nullable: true })
  virtualWalletTransactionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;
}

