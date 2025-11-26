import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MarathonParticipant } from './marathon-participant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('password_requests')
@Index(['participantId', 'requestedAt'])
@Index(['userId', 'requestedAt'])
@Index(['ipAddress', 'requestedAt'])
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

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true, type: 'text' })
  userAgent: string;

  @Column({ type: 'uuid', nullable: true })
  sessionId: string;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    device?: string;
    os?: string;
    browser?: string;
    platform?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  location: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };

  @CreateDateColumn()
  requestedAt: Date;
}

