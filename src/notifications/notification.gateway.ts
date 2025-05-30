import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';
import { JwtService } from '@nestjs/jwt';

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
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
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

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      const index = sockets.indexOf(client);
      if (index > -1) {
        sockets.splice(index, 1);
      }
      if (sockets.length === 0) {
        this.userSockets.delete(userId);
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
      notification.recipients.forEach(recipient => {
        const userSockets = this.userSockets.get(recipient.uid);
        if (userSockets) {
          userSockets.forEach(socket => {
            socket.emit('notification', notification);
          });
        }
      });
    }
  }

  // Send notification to a specific user
  async sendNotificationToUser(userId: string, notification: Notification) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socket => {
        socket.emit('notification', notification);
      });
    }
  }
} 