import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification, NotificationType, NotificationScope } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationGateway } from './notification.gateway';
import { QueryBuilder } from 'typeorm';

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
      .leftJoin('notification.recipients', 'recipients')
      .leftJoin('notification.readBy', 'readBy')
      .setParameter('userId', userId)
      .where('notification.scope = :broadcast', { broadcast: NotificationScope.BROADCAST })
      .orWhere('recipients.id = :userId', { userId })
      .andWhere('notification.deletedAt IS NULL')
      .orderBy('notification.createdAt', 'DESC')
      .getMany()
      .then(notifications => notifications.map(notification => ({
        ...notification,
        isRead: notification.readBy.some(reader => reader.id === userId),
      })));
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

    const user = await this.userRepository.findOne({ where: { id: userId } });
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

  async getUnreadCount(id: string): Promise<number> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.recipients', 'recipients')
      .leftJoin('notification.readBy', 'readBy')
      .where('(notification.scope = :broadcast OR recipients.id = :id)', {
        broadcast: NotificationScope.BROADCAST,
        id,
      })
      .andWhere('notification.deletedAt IS NULL')
      .andWhere('readBy.id IS NULL')
      .getCount();
  }

  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<Notification[]> {
    const notifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipients', 'recipients')
      .leftJoinAndSelect('notification.readBy', 'readBy')
      .where('notification.id IN (:...notificationIds)', { notificationIds })
      .andWhere('(notification.scope = :broadcast OR recipients.id = :userId)', {
        broadcast: NotificationScope.BROADCAST,
        userId,
      })
      .getMany();

    if (notifications.length !== notificationIds.length) {
      throw new NotFoundException('One or more notifications not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        if (!notification.readBy) {
          notification.readBy = [];
        }
        if (!notification.readBy.some(reader => reader.id === userId)) {
          notification.readBy.push(user);
        }
        const updated = await this.notificationRepository.save(notification);
        // Notify about read status
        await this.notificationGateway.sendNotificationToUser(userId, updated);
        return updated;
      })
    );

    return updatedNotifications;
  }
} 