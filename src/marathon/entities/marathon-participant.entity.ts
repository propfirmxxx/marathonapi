import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Marathon } from './marathon.entity';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../metaapi/entities/account.entity';

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

  @OneToOne(() => Account, account => account.participant)
  account: Account;

  @Column({ nullable: true })
  metaTraderAccountId: string;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 