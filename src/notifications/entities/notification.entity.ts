import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, DeleteDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  WARNING = 'warning',
  INFO = 'info',
}

export enum NotificationStatus {
  PENDING = 'pending',
  READ = 'read',
  DELETED = 'deleted',
}

export enum NotificationScope {
  BROADCAST = 'broadcast',
  SPECIFIC = 'specific',
}

@Entity('notifications')
export class Notification {
  @ApiProperty({
    description: 'The unique identifier of the notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The title of the notification',
    example: 'System Update',
  })
  @Column()
  title: string;

  @ApiProperty({
    description: 'The message content of the notification',
    example: 'The system will be updated tomorrow at 2 AM.',
  })
  @Column('text')
  message: string;

  @ApiProperty({
    description: 'The type of notification',
    enum: NotificationType,
    example: NotificationType.INFO,
  })
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'The scope of the notification',
    enum: NotificationScope,
    example: NotificationScope.SPECIFIC,
  })
  @Column({
    type: 'enum',
    enum: NotificationScope,
    default: NotificationScope.SPECIFIC,
  })
  scope: NotificationScope;

  @ApiProperty({
    description: 'The users who should receive this notification',
    type: () => [User],
  })
  @ManyToMany(() => User)
  @JoinTable({
    name: 'notification_users',
    joinColumn: { name: 'notification_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  recipients: User[];

  @ApiProperty({
    description: 'The users who have read this notification',
    type: () => [User],
  })
  @ManyToMany(() => User)
  @JoinTable({
    name: 'notification_read_by',
    joinColumn: { name: 'notification_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  readBy: User[];

  @ApiProperty({
    description: 'The date when the notification was created',
    example: '2024-03-20T10:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the notification was last updated',
    example: '2024-03-20T10:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    description: 'The date when the notification was deleted',
    example: '2024-03-20T10:00:00Z',
    required: false,
  })
  @DeleteDateColumn()
  deletedAt: Date;
}