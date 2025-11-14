import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LiveAccountDataService, AccountSnapshot } from './live-account-data.service';
import { MarathonLeaderboardService, LeaderboardEntry, MarathonLeaderboard } from './marathon-leaderboard.service';

interface ClientSubscription {
  marathons: Set<string>;
  accounts: Set<string>;
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'marathon-live',
})
export class MarathonLiveDataGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarathonLiveDataGateway.name);
  private clientSubscriptions = new Map<string, ClientSubscription>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly liveAccountDataService: LiveAccountDataService,
    private readonly leaderboardService: MarathonLeaderboardService,
  ) {}

  async onModuleInit() {
    // Listen to account updates from RabbitMQ
    this.liveAccountDataService.onAccountUpdate((snapshot) => {
      this.handleAccountUpdate(snapshot);
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!payload) {
        this.logger.warn(`Client ${client.id} disconnected: Invalid token`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      const userId = payload.sub;

      this.clientSubscriptions.set(client.id, {
        marathons: new Set(),
        accounts: new Set(),
        userId,
      });

      this.logger.log(`Client ${client.id} connected (User: ${userId})`);
      client.emit('connected', { message: 'Connected to Marathon Live Data stream' });
    } catch (error) {
      this.logger.error(`Authentication error for client ${client.id}:`, error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (subscription) {
      this.logger.log(
        `Client ${client.id} disconnected (Marathons: ${subscription.marathons.size}, Accounts: ${subscription.accounts.size})`,
      );
      this.clientSubscriptions.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe_marathon')
  async handleSubscribeMarathon(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { marathonId: string },
  ) {
    try {
      const subscription = this.clientSubscriptions.get(client.id);
      if (!subscription) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      if (!data?.marathonId) {
        client.emit('error', { message: 'marathonId is required' });
        return;
      }

      subscription.marathons.add(data.marathonId);
      this.logger.log(`Client ${client.id} subscribed to marathon ${data.marathonId}`);

      // Send initial leaderboard data
      const snapshots = this.liveAccountDataService.getAllSnapshots();
      const leaderboard = await this.leaderboardService.calculateLeaderboard(
        data.marathonId,
        snapshots,
      );

      if (leaderboard) {
        client.emit('marathon_leaderboard', leaderboard);
      }

      client.emit('subscribed', { 
        type: 'marathon', 
        marathonId: data.marathonId,
        message: `Subscribed to marathon ${data.marathonId}`,
      });
    } catch (error) {
      this.logger.error(`Error subscribing to marathon:`, error.message);
      client.emit('error', { message: 'Failed to subscribe to marathon' });
    }
  }

  @SubscribeMessage('subscribe_account')
  async handleSubscribeAccount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { accountLogin: string },
  ) {
    try {
      const subscription = this.clientSubscriptions.get(client.id);
      if (!subscription) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      if (!data?.accountLogin) {
        client.emit('error', { message: 'accountLogin is required' });
        return;
      }

      subscription.accounts.add(data.accountLogin);
      this.logger.log(`Client ${client.id} subscribed to account ${data.accountLogin}`);

      // Send initial account data
      const snapshots = this.liveAccountDataService.getAllSnapshots();
      const entry = await this.leaderboardService.getAccountLeaderboardEntry(
        data.accountLogin,
        snapshots,
      );

      if (entry) {
        client.emit('account_update', entry);
      }

      client.emit('subscribed', { 
        type: 'account', 
        accountLogin: data.accountLogin,
        message: `Subscribed to account ${data.accountLogin}`,
      });
    } catch (error) {
      this.logger.error(`Error subscribing to account:`, error.message);
      client.emit('error', { message: 'Failed to subscribe to account' });
    }
  }

  @SubscribeMessage('unsubscribe_marathon')
  handleUnsubscribeMarathon(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { marathonId: string },
  ) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (!subscription) {
      return;
    }

    if (!data?.marathonId) {
      client.emit('error', { message: 'marathonId is required' });
      return;
    }

    subscription.marathons.delete(data.marathonId);
    this.logger.log(`Client ${client.id} unsubscribed from marathon ${data.marathonId}`);
    
    client.emit('unsubscribed', { 
      type: 'marathon', 
      marathonId: data.marathonId,
      message: `Unsubscribed from marathon ${data.marathonId}`,
    });
  }

  @SubscribeMessage('unsubscribe_account')
  handleUnsubscribeAccount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { accountLogin: string },
  ) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (!subscription) {
      return;
    }

    if (!data?.accountLogin) {
      client.emit('error', { message: 'accountLogin is required' });
      return;
    }

    subscription.accounts.delete(data.accountLogin);
    this.logger.log(`Client ${client.id} unsubscribed from account ${data.accountLogin}`);
    
    client.emit('unsubscribed', { 
      type: 'account', 
      accountLogin: data.accountLogin,
      message: `Unsubscribed from account ${data.accountLogin}`,
    });
  }

  private async handleAccountUpdate(snapshot: AccountSnapshot) {
    const snapshots = this.liveAccountDataService.getAllSnapshots();

    // Track which marathons need updates
    const marathonsToUpdate = new Set<string>();

    // Find all clients subscribed to this specific account
    for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
      if (subscription.accounts.has(snapshot.login)) {
        const entry = await this.leaderboardService.getAccountLeaderboardEntry(
          snapshot.login,
          snapshots,
        );

        if (entry) {
          this.server.to(clientId).emit('account_update', entry);
        }

        // Also track marathons for this account
        if (entry) {
          // We need to get the marathonId from the participant
          const accountLogins = await this.leaderboardService.getMarathonAccountLogins(entry.participantId);
          // Note: This is a simplified approach; in production, you'd want to cache marathon-account mappings
        }
      }
    }

    // For marathon subscriptions, we need to check which marathons contain this account
    // This is simplified - in production, you'd want to maintain a reverse index
    for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
      for (const marathonId of subscription.marathons) {
        const accountLogins = await this.leaderboardService.getMarathonAccountLogins(marathonId);
        
        if (accountLogins.includes(snapshot.login)) {
          marathonsToUpdate.add(marathonId);
        }
      }
    }

    // Send updated leaderboards for affected marathons
    for (const marathonId of marathonsToUpdate) {
      const leaderboard = await this.leaderboardService.calculateLeaderboard(
        marathonId,
        snapshots,
      );

      if (leaderboard) {
        // Send to all clients subscribed to this marathon
        for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
          if (subscription.marathons.has(marathonId)) {
            this.server.to(clientId).emit('marathon_leaderboard', leaderboard);
          }
        }
      }
    }
  }
}

