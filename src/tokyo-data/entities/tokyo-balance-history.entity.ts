import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MetaTraderAccount } from '../../metatrader-accounts/entities/meta-trader-account.entity';

/**
 * Balance history from Tokyo service
 * Stores balance change events over time
 */
@Entity('tokyo_balance_history')
@Index(['metaTraderAccountId', 'time'])
export class TokyoBalanceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  @Index()
  metaTraderAccountId: string;

  @ManyToOne(() => MetaTraderAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'metaTraderAccountId' })
  metaTraderAccount: MetaTraderAccount;

  @Column({ type: 'timestamp', nullable: false })
  @Index()
  time: Date;

  @Column({ nullable: true })
  ticket: number;

  @Column({ nullable: true })
  type: number; // Deal type

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  delta: number; // Balance change amount

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  balance: number; // Balance after this event

  @Column('text', { nullable: true })
  comment: string;

  @Column('json', { nullable: true })
  rawData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

