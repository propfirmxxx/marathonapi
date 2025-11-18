import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../entities/session.entity';

export class SessionResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'IP address of the session',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent of the session',
    example: 'Mozilla/5.0...',
  })
  userAgent: string;

  @ApiProperty({
    description: 'Device information',
    example: { device: 'Desktop', os: 'Windows', browser: 'Chrome' },
  })
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
  })
  status: SessionStatus;

  @ApiProperty({
    description: 'Token expiration date',
    example: '2024-12-31T23:59:59Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastActivityAt: Date;

  @ApiProperty({
    description: 'Session creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Is this the current session',
    example: false,
  })
  isCurrent?: boolean;
}

