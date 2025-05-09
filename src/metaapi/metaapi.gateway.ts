import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { MetaApiService } from './metaapi.service';
import { Socket } from 'socket.io';
import { WsThrottlerGuard } from '../guards/ws-throttler.guard';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { SynchronizationListener } from 'metaapi.cloud-sdk';

class AccountUpdateListener extends SynchronizationListener {
  constructor(private client: Socket, private accountId: string) {
    super();
  }

  async onAccountInformationUpdated(instanceIndex: string, accountInformation: any) {
    try {
      this.client.emit('accountUpdate', {
        accountId: this.accountId,
        balance: accountInformation.balance,
        equity: accountInformation.equity,
        margin: accountInformation.margin,
        freeMargin: accountInformation.freeMargin,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error emitting account update: ${error.message}`);
    }
  }
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(WsThrottlerGuard, AuthGuard)
export class MetaApiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MetaApiGateway.name);
  private activeConnections: Map<string, Socket> = new Map();
  private accountSubscriptions: Map<string, any> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private readonly MAX_CONNECTIONS_PER_USER = 5;

  constructor(private readonly metaApiService: MetaApiService) {}

  async handleConnection(client: Socket) {
    try {
      // Get user from the authentication token
      const user = client.handshake.auth.user;
      if (!user) {
        this.logger.error(`Unauthorized connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      // Check connection limit per user
      const userConnections = this.connectionCounts.get(user.id) || 0;
      if (userConnections >= this.MAX_CONNECTIONS_PER_USER) {
        this.logger.error(`Connection limit exceeded for user: ${user.id}`);
        client.disconnect();
        return;
      }

      // Update connection counts
      this.connectionCounts.set(user.id, userConnections + 1);
      this.activeConnections.set(client.id, client);
      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const user = client.handshake.auth.user;
      if (user) {
        const userConnections = this.connectionCounts.get(user.id) || 0;
        this.connectionCounts.set(user.id, Math.max(0, userConnections - 1));
      }

      this.activeConnections.delete(client.id);
      
      // Clean up any account subscriptions
      for (const [accountId, subscription] of this.accountSubscriptions.entries()) {
        if (subscription.clientId === client.id) {
          await subscription.connection.unsubscribe();
          this.accountSubscriptions.delete(accountId);
        }
      }

      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error(`Error in handleDisconnect: ${error.message}`);
    }
  }

  @SubscribeMessage('subscribeToAccount')
  async handleSubscribeToAccount(client: Socket, accountId: string) {
    try {
      // Validate user has access to this account
      const user = client.handshake.auth.user;
      if (!user || !await this.metaApiService.validateAccountAccess(user.id, accountId)) {
        return { success: false, error: 'Unauthorized access' };
      }

      const connection = await this.metaApiService.subscribeToAccountUpdates(accountId);
      
      const listener = new AccountUpdateListener(client, accountId);
      connection.addSynchronizationListener(listener);
      
      // Store the subscription
      this.accountSubscriptions.set(accountId, {
        connection,
        clientId: client.id,
        userId: user.id,
        listener
      });

      // Get initial balance
      const initialBalance = await this.metaApiService.getAccountBalance(accountId);
      client.emit('accountUpdate', {
        accountId,
        ...initialBalance,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error subscribing to account updates: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('unsubscribeFromAccount')
  async handleUnsubscribeFromAccount(client: Socket, accountId: string) {
    try {
      const subscription = this.accountSubscriptions.get(accountId);
      const user = client.handshake.auth.user;

      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      // Validate user has access to this subscription
      if (!user || subscription.userId !== user.id) {
        return { success: false, error: 'Unauthorized access' };
      }

      if (subscription.clientId === client.id) {
        subscription.connection.removeSynchronizationListener(subscription.listener);
        await subscription.connection.unsubscribe();
        this.accountSubscriptions.delete(accountId);
        return { success: true };
      }

      return { success: false, error: 'No active subscription found' };
    } catch (error) {
      this.logger.error(`Error unsubscribing from account: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
} 