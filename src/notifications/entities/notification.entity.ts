import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../users/entities/user.entity';

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
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationScope,
    default: NotificationScope.SPECIFIC,
  })
  scope: NotificationScope;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'notification_users',
    joinColumn: { name: 'notification_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  recipients: User[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'notification_read_by',
    joinColumn: { name: 'notification_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  readBy: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}