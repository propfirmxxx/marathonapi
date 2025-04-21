import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { MarathonParticipant } from '../../marathon/entities/marathon-participant.entity';

@Entity('metaapi_accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  accountId: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  equity: number;

  @Column({ type: 'json', nullable: true })
  accountInfo: Record<string, any>;

  @OneToOne(() => MarathonParticipant, participant => participant.account)
  @JoinColumn({ name: 'participant_id' })
  participant: MarathonParticipant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 