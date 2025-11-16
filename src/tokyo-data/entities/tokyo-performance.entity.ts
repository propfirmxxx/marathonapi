import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MetaTraderAccount } from '../../metatrader-accounts/entities/meta-trader-account.entity';

/**
 * Performance metrics from Tokyo service
 * Stores aggregated performance statistics
 */
@Entity('tokyo_performance')
@Index(['metaTraderAccountId', 'updatedAt'])
export class TokyoPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  @Index()
  metaTraderAccountId: string;

  @ManyToOne(() => MetaTraderAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'metaTraderAccountId' })
  metaTraderAccount: MetaTraderAccount;

  // Current account state
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  balance: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  equity: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  profit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  margin: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  freeMargin: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  marginLevel: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  creditFacility: number;

  // Performance metrics
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalNetProfit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  grossProfit: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  grossLoss: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  profitFactor: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  expectedPayoff: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  recoveryFactor: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  sharpeRatio: number;

  // Drawdown metrics
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  balanceDrawdownAbsolute: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  balanceDrawdownMaximal: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  balanceDrawdownRelativePercent: number;

  // Trade statistics
  @Column({ nullable: true })
  totalTrades: number;

  @Column({ nullable: true })
  profitTrades: number;

  @Column({ nullable: true })
  lossTrades: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  largestProfitTrade: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  largestLossTrade: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  averageProfitTrade: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  averageLossTrade: number;

  // Consecutive trades
  @Column({ nullable: true })
  maxConsecutiveWins: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  maxConsecutiveWinsProfit: number;

  @Column({ nullable: true })
  maxConsecutiveLosses: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  maxConsecutiveLossesLoss: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  averageConsecutiveWins: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  averageConsecutiveLosses: number;

  @Column('json', { nullable: true })
  rawData: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  dataTimestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

