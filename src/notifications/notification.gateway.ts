import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Socket[]> = new Map();

  async handleConnection(client: Socket) {
    const user = client.handshake.auth.user;
    if (user) {
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, []);
      }
      this.userSockets.get(user.id).push(client);
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.handshake.auth.user;
    if (user) {
      const sockets = this.userSockets.get(user.id);
      if (sockets) {
        const index = sockets.indexOf(client);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          this.userSockets.delete(user.id);
        }
      }
    }
  }

  // Send notification to specific users
  async sendNotification(notification: Notification) {
    if (notification.scope === 'broadcast') {
      // Send to all connected clients
      this.server.emit('notification', notification);
    } else {
      // Send to specific recipients
      for (const recipient of notification.recipients) {
        await this.sendNotificationToUser(recipient.id, notification);
      }
    }
  }

  // Send notification to a specific user
  async sendNotificationToUser(userId: string, notification: Notification) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      for (const socket of userSockets) {
        socket.emit('notification', notification);
      }
    }
  }
} 