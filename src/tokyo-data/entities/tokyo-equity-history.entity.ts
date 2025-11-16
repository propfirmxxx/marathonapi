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
 * Equity history from Tokyo service
 * Stores equity points over time
 */
@Entity('tokyo_equity_history')
@Index(['metaTraderAccountId', 'time'])
export class TokyoEquityHistory {
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

  @Column('decimal', { precision: 15, scale: 2, nullable: false })
  equity: number;

  @Column('json', { nullable: true })
  rawData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

