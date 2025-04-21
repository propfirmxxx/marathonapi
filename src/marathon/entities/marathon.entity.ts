import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MarathonParticipant } from './marathon-participant.entity';

@Entity('marathons')
export class Marathon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  entryFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  awardsAmount: number;

  @Column()
  maxPlayers: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json' })
  rules: Record<string, any>;

  @Column({ default: 0 })
  currentPlayers: number;

  @OneToMany(() => MarathonParticipant, participant => participant.marathon)
  participants: MarathonParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 