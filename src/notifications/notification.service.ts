import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification, NotificationType, NotificationScope } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationGateway: NotificationGateway,
  ) {}

  async createNotification(
    title: string,
    message: string,
    type: NotificationType,
    scope: NotificationScope,
    recipientIds?: string[],
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      title,
      message,
      type,
      scope,
    });

    if (scope === NotificationScope.SPECIFIC && recipientIds?.length) {
      const recipients = await this.userRepository.find({ where: { id: In(recipientIds) } });
      if (recipients.length !== recipientIds.length) {
        throw new NotFoundException('One or more recipient users not found');
      }
      notification.recipients = recipients;
    }

    const savedNotification = await this.notificationRepository.save(notification);
    
    // Send real-time notification
    await this.notificationGateway.sendNotification(savedNotification);
    
    return savedNotification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipients', 'recipients')
      .leftJoinAndSelect('notification.readBy', 'readBy')
      .where('notification.scope = :broadcast', { broadcast: NotificationScope.BROADCAST })
      .orWhere('recipients.id = :userId', { userId })
      .andWhere('notification.deletedAt IS NULL')
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipients', 'recipients')
      .leftJoinAndSelect('notification.readBy', 'readBy')
      .where('notification.id = :notificationId', { notificationId })
      .andWhere('(notification.scope = :broadcast OR recipients.id = :userId)', {
        broadcast: NotificationScope.BROADCAST,
        userId,
      })
      .getOne();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const user = await this.userRepository.findOne({ where: { uid: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!notification.readBy) {
      notification.readBy = [];
    }
    notification.readBy.push(user);

    const updatedNotification = await this.notificationRepository.save(notification);
    
    // Notify about read status
    await this.notificationGateway.sendNotificationToUser(userId, updatedNotification);
    
    return updatedNotification;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipients', 'recipients')
      .where('notification.id = :notificationId', { notificationId })
      .andWhere('(notification.scope = :broadcast OR recipients.id = :userId)', {
        broadcast: NotificationScope.BROADCAST,
        userId,
      })
      .getOne();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.softDelete(notificationId);
    
    // Notify about deletion
    await this.notificationGateway.sendNotificationToUser(userId, notification);
  }

  async broadcastNotification(
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
  ): Promise<Notification> {
    return this.createNotification(
      title,
      message,
      type,
      NotificationScope.BROADCAST,
    );
  }

  async getUnreadCount(uid: string): Promise<number> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.recipients', 'recipients')
      .leftJoin('notification.readBy', 'readBy')
      .where('(notification.scope = :broadcast OR recipients.uid = :uid)', {
        broadcast: NotificationScope.BROADCAST,
        uid,
      })
      .andWhere('notification.deletedAt IS NULL')
      .andWhere('readBy.uid IS NULL')
      .getCount();
  }
} 