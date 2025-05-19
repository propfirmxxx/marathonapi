import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationScope } from './entities/notification.entity';
import { UserRole } from '../users/entities/user.entity';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(AdminGuard)
  async createNotification(
    @Body() body: {
      title: string;
      message: string;
      type: NotificationType;
      scope: NotificationScope;
      recipientIds?: string[];
    },
  ) {
    return this.notificationService.createNotification(
      body.title,
      body.message,
      body.type,
      body.scope,
      body.recipientIds,
    );
  }

  @Get()
  async getNotifications(@Request() req) {
    return this.notificationService.getNotifications(req.user.id);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req) {
    return this.notificationService.deleteNotification(id, req.user.id);
  }
}