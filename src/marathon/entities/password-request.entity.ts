import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MarathonParticipant } from './marathon-participant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('password_requests')
@Index(['participantId', 'requestedAt'])
export class PasswordRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MarathonParticipant)
  @JoinColumn({ name: 'participantId' })
  participant: MarathonParticipant;

  @Column({ type: 'uuid' })
  @Index()
  participantId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: ['master', 'investor'], default: 'master' })
  passwordType: 'master' | 'investor';

  @CreateDateColumn()
  requestedAt: Date;
}

