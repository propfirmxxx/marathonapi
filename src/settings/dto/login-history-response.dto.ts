import { ApiProperty } from '@nestjs/swagger';
import { LoginStatus, LoginMethod } from '../entities/login-history.entity';

export class LoginHistoryResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the login history entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Login status',
    enum: LoginStatus,
    example: LoginStatus.SUCCESS,
  })
  status: LoginStatus;

  @ApiProperty({
    description: 'Login method',
    enum: LoginMethod,
    example: LoginMethod.EMAIL,
  })
  method: LoginMethod;

  @ApiProperty({
    description: 'IP address of the login attempt',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent of the login attempt',
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
    description: 'Failure reason if login failed',
    example: 'Invalid credentials',
    required: false,
  })
  failureReason?: string;

  @ApiProperty({
    description: 'Location information if available',
    example: { country: 'Iran', city: 'Tehran' },
    required: false,
  })
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };

  @ApiProperty({
    description: 'Login attempt date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

