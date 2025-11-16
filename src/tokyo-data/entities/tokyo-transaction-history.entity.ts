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
 * Transaction history from Tokyo service
 * Stores individual trade/transaction records
 */
@Entity('tokyo_transaction_history')
@Index(['metaTraderAccountId', 'openTime'])
@Index(['metaTraderAccountId', 'closeTime'])
export class TokyoTransactionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  @Index()
  metaTraderAccountId: string;

  @ManyToOne(() => MetaTraderAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'metaTraderAccountId' })
  metaTraderAccount: MetaTraderAccount;

  @Column({ nullable: true })
  positionId: number;

  @Column({ nullable: true })
  orderTicket: number;

  @Column({ type: 'timestamp', nullable: true })
  openTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  closeTime: Date;

  @Column({ length: 50, nullable: true })
  type: string; // BUY, SELL

  @Column('decimal', { precision: 15, scale: 5, nullable: true })
  volume: number;

  @Column({ length: 50, nullable: true })
  symbol: string;

  @Column('decimal', { precision: 15, scale: 5, nullable: true })
  openPrice: number;

  @Column('decimal', { precision: 15, scale: 5, nullable: true })
  closePrice: number;

  @Column('decimal', { precision: 15, scale: 5, nullable: true })
  stopLoss: number;

  @Column('decimal', { precision: 15, scale: 5, nullable: true })
  takeProfit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  profit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  commission: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  swap: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  risk: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  riskPercent: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  balanceAtOpen: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column('json', { nullable: true })
  rawData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

