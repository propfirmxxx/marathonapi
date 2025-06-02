import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationScope } from '../entities/notification.entity';

export class GetNotificationDto {
  @ApiProperty({
    description: 'The unique identifier of the notification',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'The title of the notification',
    example: 'System Update'
  })
  title: string;

  @ApiProperty({
    description: 'The message content of the notification',
    example: 'The system will be updated tomorrow at 2 AM.'
  })
  message: string;

  @ApiProperty({
    description: 'The type of notification',
    enum: NotificationType,
    example: NotificationType.INFO
  })
  type: NotificationType;

  @ApiProperty({
    description: 'The scope of the notification',
    enum: NotificationScope,
    example: NotificationScope.SPECIFIC
  })
  scope: NotificationScope;

  @ApiProperty({
    description: 'Whether the notification has been read by the current user',
    example: false
  })
  isRead: boolean;

  @ApiProperty({
    description: 'The date when the notification was created',
    example: '2024-03-20T10:00:00Z'
  })
  createdAt: Date;
}
