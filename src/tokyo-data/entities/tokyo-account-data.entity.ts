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
 * Main account data snapshot from Tokyo service
 * Stores the latest account state
 */
@Entity('tokyo_account_data')
@Index(['metaTraderAccountId', 'updatedAt'])
export class TokyoAccountData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  @Index()
  metaTraderAccountId: string;

  @ManyToOne(() => MetaTraderAccount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'metaTraderAccountId' })
  metaTraderAccount: MetaTraderAccount;

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

  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ nullable: true })
  leverage: number;

  @Column('json', { nullable: true })
  positions: any[];

  @Column('json', { nullable: true })
  orders: any[];

  @Column('json', { nullable: true })
  rawData: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  dataTimestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

