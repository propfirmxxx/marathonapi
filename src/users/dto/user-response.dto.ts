import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'User first name',
    example: 'John'
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe'
  })
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'resource',
    enum: ['admin', 'resource']
  })
  role: string;

  @ApiProperty({
    description: 'User active status',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  updatedAt: Date;
}

export class UserListResponseDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserResponseDto]
  })
  items: UserResponseDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 1
  })
  total: number;
}

export class DeleteUserResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User deleted successfully'
  })
  message: string;
} 