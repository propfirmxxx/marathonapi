import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';
import { NotificationType, NotificationScope } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'The title of the notification',
    example: 'System Update',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The message content of the notification',
    example: 'The system will be updated tomorrow at 2 AM.',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'The type of notification',
    enum: NotificationType,
    example: NotificationType.INFO,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'The scope of the notification',
    enum: NotificationScope,
    example: NotificationScope.SPECIFIC,
  })
  @IsEnum(NotificationScope)
  scope: NotificationScope;

  @ApiProperty({
    description: 'Array of user IDs who should receive the notification',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recipientIds?: string[];
} 