import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum LoginMethod {
  EMAIL = 'email',
  GOOGLE = 'google',
}

@Entity('login_history')
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
export class LoginHistory {
  @ApiProperty({
    description: 'The unique identifier of the login history entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The user ID this login history belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    description: 'Login status',
    enum: LoginStatus,
    example: LoginStatus.SUCCESS,
  })
  @Column({
    type: 'enum',
    enum: LoginStatus,
  })
  status: LoginStatus;

  @ApiProperty({
    description: 'Login method',
    enum: LoginMethod,
    example: LoginMethod.EMAIL,
  })
  @Column({
    type: 'enum',
    enum: LoginMethod,
    default: LoginMethod.EMAIL,
  })
  method: LoginMethod;

  @ApiProperty({
    description: 'IP address of the login attempt',
    example: '192.168.1.1',
  })
  @Column({ nullable: true })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent of the login attempt',
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
    description: 'Failure reason if login failed',
    example: 'Invalid credentials',
    required: false,
  })
  @Column({ nullable: true, type: 'text' })
  failureReason: string;

  @ApiProperty({
    description: 'Location information if available',
    example: { country: 'Iran', city: 'Tehran' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  location: {
    country?: string;
    city?: string;
    region?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}

