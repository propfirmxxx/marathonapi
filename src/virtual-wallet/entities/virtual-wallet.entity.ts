import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { VirtualWalletTransaction } from './virtual-wallet-transaction.entity';

@Entity('virtual_wallets')
export class VirtualWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, user => user.virtualWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ default: false })
  isFrozen: boolean;

  @OneToMany(() => VirtualWalletTransaction, transaction => transaction.wallet)
  transactions: VirtualWalletTransaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

