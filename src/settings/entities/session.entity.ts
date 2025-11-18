import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('sessions')
@Index(['userId', 'status'])
@Index(['token', 'status'])
export class Session {
  @ApiProperty({
    description: 'The unique identifier of the session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The user ID this session belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    description: 'JWT token identifier (jti)',
    example: 'jwt-token-id',
  })
  @Column({ unique: true })
  token: string;

  @ApiProperty({
    description: 'IP address of the session',
    example: '192.168.1.1',
  })
  @Column({ nullable: true })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent of the session',
    example: 'Mozilla/5.0...',
  })
  @Column({ nullable: true, type: 'text' })
  userAgent: string;

  @ApiProperty({
    description: 'Device information',
    example: { device: 'Desktop', os: 'Windows', browser: 'Chrome' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    device?: string;
    os?: string;
    browser?: string;
    platform?: string;
  };

  @ApiProperty({
    description: 'Session status',
    enum: SessionStatus,
    example: SessionStatus.ACTIVE,
    default: SessionStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @ApiProperty({
    description: 'Token expiration date',
    example: '2024-12-31T23:59:59Z',
  })
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

