import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationDto } from './dto/get-notification.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({ 
    status: 201, 
    description: 'The notification has been successfully created.',
    type: CreateNotificationDto 
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required.' })
  @ApiResponse({ status: 404, description: 'One or more recipient users not found.' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.createNotification(
      createNotificationDto.title,
      createNotificationDto.message,
      createNotificationDto.type,
      createNotificationDto.scope,
      createNotificationDto.recipientIds,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all notifications (personal and broadcast) for the user.',
    type: [GetNotificationDto]
  })
  async getNotifications(@Request() req) {
    return this.notificationService.getNotifications(req.user.id);
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiBody({ type: MarkNotificationsReadDto })
  @ApiResponse({ 
    status: 200, 
    description: 'The notifications have been marked as read.',
    type: [GetNotificationDto]
  })
  @ApiResponse({ status: 404, description: 'One or more notifications not found.' })
  async markAsRead(@Body() dto: MarkNotificationsReadDto, @Request() req) {
    return this.notificationService.markMultipleAsRead(dto.notificationIds, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'The notification has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async deleteNotification(@Param('id') id: string, @Request() req) {
    return 'Disabled'
    // return this.notificationService.deleteNotification(id, req.user.id);
  }
}