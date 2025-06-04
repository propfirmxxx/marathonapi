import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { config } from 'dotenv';

config()

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

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });
      if (!token || !payload) {
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId).push(client);
    } catch (error) {
      client.disconnect();
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