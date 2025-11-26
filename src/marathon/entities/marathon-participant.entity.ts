import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Marathon } from './marathon.entity';
import { User } from '../../users/entities/user.entity';
import { MetaTraderAccount } from '../../metatrader-accounts/entities/meta-trader-account.entity';
import { ParticipantStatus } from '../enums/participant-status.enum';

export interface RuleViolation {
  rule: string; // MarathonRule enum value as string
  value: number;
  limit: number;
}

@Entity('marathon_participants')
export class MarathonParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Marathon, marathon => marathon.participants)
  @JoinColumn({ name: 'marathon_id' })
  marathon: Marathon;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => MetaTraderAccount, { nullable: true })
  @JoinColumn({ name: 'metaTraderAccountId' })
  metaTraderAccount: MetaTraderAccount;

  @Column({ nullable: true })
  metaTraderAccountId: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'enum', enum: ParticipantStatus, default: ParticipantStatus.ACTIVE })
  status: ParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'uuid', nullable: true })
  refundTransactionId: string;

  @Column({ type: 'jsonb', nullable: true })
  disqualificationReason: RuleViolation[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 