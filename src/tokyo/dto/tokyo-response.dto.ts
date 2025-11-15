import { ApiProperty } from '@nestjs/swagger';

export class AccountDeploymentResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Human-readable deployment status message',
    example: 'Account deployed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Path to the account configuration file on the host',
    example: '/path/to/config.ini',
    nullable: true,
    required: false,
  })
  config_path?: string | null;

  @ApiProperty({
    description: 'Latest data payload received from the socket server, if available',
    nullable: true,
    required: false,
  })
  data_preview?: any | null;
}

export class MessageResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Human-readable status message',
    example: 'Operation completed successfully',
  })
  message: string;
}

export class LatestDataResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'empty'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Optional message if no data available',
    example: 'No data available',
    nullable: true,
    required: false,
  })
  message?: string | null;

  @ApiProperty({
    description: 'Latest payload data, if available',
    nullable: true,
    required: false,
  })
  data?: any | null;
}

export class AccountListResponseDto {
  @ApiProperty({
    description: "Status: 'success' or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'List of active account logins',
    example: ['261632689', '261632690'],
    type: [String],
  })
  accounts: string[];

  @ApiProperty({
    description: 'Total number of active accounts',
    example: 2,
    default: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Optional message',
    nullable: true,
    required: false,
  })
  message?: string | null;
}

export class AccountDataResponseDto {
  @ApiProperty({
    description: "Status: 'success', 'not_found', or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'Account data',
    nullable: true,
    required: false,
  })
  data?: any | null;

  @ApiProperty({
    description: 'Error message if applicable',
    nullable: true,
    required: false,
  })
  message?: string | null;

  @ApiProperty({
    description: 'Timestamp when data was cached',
    nullable: true,
    required: false,
  })
  cached_at?: number | null;
}

export class PositionsResponseDto {
  @ApiProperty({
    description: "Status: 'success', 'not_found', or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'List of open positions',
    type: [Object],
  })
  positions: any[];

  @ApiProperty({
    description: 'Total number of positions',
    example: 2,
    default: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Error message if applicable',
    nullable: true,
    required: false,
  })
  message?: string | null;
}

export class OrdersResponseDto {
  @ApiProperty({
    description: "Status: 'success', 'not_found', or 'error'",
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Account login',
    example: '261632689',
    nullable: true,
    required: false,
  })
  login?: string | null;

  @ApiProperty({
    description: 'List of pending orders',
    type: [Object],
  })
  orders: any[];

  @ApiProperty({
    description: 'Total number of orders',
    example: 1,
    default: 0,
  })
  total: number;

  @ApiProperty({
    description: 'Error message if applicable',
    nullable: true,
    required: false,
  })
  message?: string | null;
}

