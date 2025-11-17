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
import { MarathonService } from './marathon.service';

interface ClientSubscription {
  marathons: Set<string>;
  accounts: Set<string>;
  participants: Set<string>; // participant IDs
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
  
  // Track active marathon subscriptions (reference counting)
  private marathonSubscriptionCount = new Map<string, number>();
  
  // Track active participant subscriptions (reference counting)
  private participantSubscriptionCount = new Map<string, number>();
  
  // Track if we're listening to RabbitMQ updates
  private isListeningToUpdates = false;
  private accountUpdateHandler: ((snapshot: AccountSnapshot) => void) | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly liveAccountDataService: LiveAccountDataService,
    private readonly leaderboardService: MarathonLeaderboardService,
    private readonly marathonService: MarathonService,
  ) {}

  async onModuleInit() {
    // Don't listen to RabbitMQ updates on startup
    // We'll subscribe when first client connects
    this.logger.log('MarathonLiveDataGateway initialized (smart subscription mode)');
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
        participants: new Set(),
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

  async handleDisconnect(client: Socket) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (subscription) {
      this.logger.log(
        `Client ${client.id} disconnected ` +
        `(Marathons: ${subscription.marathons.size}, ` +
        `Accounts: ${subscription.accounts.size}, ` +
        `Participants: ${subscription.participants.size})`,
      );
      
      // Unsubscribe from all marathons this client was subscribed to
      for (const marathonId of subscription.marathons) {
        await this.decrementMarathonSubscription(marathonId);
      }
      
      // Unsubscribe from all participants this client was subscribed to
      for (const participantId of subscription.participants) {
        await this.decrementParticipantSubscription(participantId);
      }
      
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

      // Check if already subscribed
      if (subscription.marathons.has(data.marathonId)) {
        this.logger.debug(`Client ${client.id} already subscribed to marathon ${data.marathonId}`);
        return;
      }

      subscription.marathons.add(data.marathonId);
      
      // Increment subscription count and subscribe to RabbitMQ if needed
      await this.incrementMarathonSubscription(data.marathonId);
      
      this.logger.log(
        `Client ${client.id} subscribed to marathon ${data.marathonId} ` +
        `(total subscribers: ${this.marathonSubscriptionCount.get(data.marathonId) || 0})`
      );

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
  async handleUnsubscribeMarathon(
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

    if (!subscription.marathons.has(data.marathonId)) {
      return; // Not subscribed
    }

    subscription.marathons.delete(data.marathonId);
    
    // Decrement subscription count and unsubscribe from RabbitMQ if needed
    await this.decrementMarathonSubscription(data.marathonId);
    
    this.logger.log(
      `Client ${client.id} unsubscribed from marathon ${data.marathonId} ` +
      `(remaining subscribers: ${this.marathonSubscriptionCount.get(data.marathonId) || 0})`
    );
    
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

  @SubscribeMessage('subscribe_participant')
  async handleSubscribeParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { participantId: string },
  ) {
    try {
      const subscription = this.clientSubscriptions.get(client.id);
      if (!subscription) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      if (!data?.participantId) {
        client.emit('error', { message: 'participantId is required' });
        return;
      }

      // Check if already subscribed
      if (subscription.participants.has(data.participantId)) {
        this.logger.debug(`Client ${client.id} already subscribed to participant ${data.participantId}`);
        return;
      }

      subscription.participants.add(data.participantId);
      
      // Increment subscription count and subscribe to marathon if needed
      await this.incrementParticipantSubscription(data.participantId);
      
      this.logger.log(
        `Client ${client.id} subscribed to participant ${data.participantId} ` +
        `(total subscribers: ${this.participantSubscriptionCount.get(data.participantId) || 0})`
      );

      // Get participant info and send initial data
      const participant = await this.marathonService.getParticipantById(data.participantId);
      if (!participant) {
        client.emit('error', { message: 'Participant not found' });
        return;
      }

      // Get account data if available
      const snapshots = this.liveAccountDataService.getAllSnapshots();
      const accountLogin = participant.metaTraderAccount?.login;
      
      if (accountLogin) {
        const entry = await this.leaderboardService.getAccountLeaderboardEntry(
          accountLogin,
          snapshots,
        );

        if (entry) {
          client.emit('participant_update', {
            participantId: data.participantId,
            ...entry,
          });
        }
      }

      client.emit('subscribed', { 
        type: 'participant', 
        participantId: data.participantId,
        message: `Subscribed to participant ${data.participantId}`,
      });
    } catch (error) {
      this.logger.error(`Error subscribing to participant:`, error.message);
      client.emit('error', { message: 'Failed to subscribe to participant' });
    }
  }

  @SubscribeMessage('unsubscribe_participant')
  async handleUnsubscribeParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { participantId: string },
  ) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (!subscription) {
      return;
    }

    if (!data?.participantId) {
      client.emit('error', { message: 'participantId is required' });
      return;
    }

    if (!subscription.participants.has(data.participantId)) {
      return; // Not subscribed
    }

    subscription.participants.delete(data.participantId);
    
    // Decrement subscription count and unsubscribe from marathon if needed
    await this.decrementParticipantSubscription(data.participantId);
    
    this.logger.log(
      `Client ${client.id} unsubscribed from participant ${data.participantId} ` +
      `(remaining subscribers: ${this.participantSubscriptionCount.get(data.participantId) || 0})`
    );
    
    client.emit('unsubscribed', { 
      type: 'participant', 
      participantId: data.participantId,
      message: `Unsubscribed from participant ${data.participantId}`,
    });
  }

  /**
   * Start listening to RabbitMQ updates (if not already listening)
   */
  private startListeningToUpdates() {
    if (this.isListeningToUpdates) {
      return; // Already listening
    }

    this.accountUpdateHandler = (snapshot: AccountSnapshot) => {
      this.handleAccountUpdate(snapshot);
    };

    this.liveAccountDataService.onAccountUpdate(this.accountUpdateHandler);
    this.isListeningToUpdates = true;
    
    this.logger.log('🎧 Started listening to RabbitMQ updates');
  }

  /**
   * Stop listening to RabbitMQ updates (if no more subscriptions)
   */
  private stopListeningToUpdates() {
    if (!this.isListeningToUpdates || !this.accountUpdateHandler) {
      return;
    }

    this.liveAccountDataService.removeAccountUpdateListener(this.accountUpdateHandler);
    this.accountUpdateHandler = null;
    this.isListeningToUpdates = false;
    
    this.logger.log('🔇 Stopped listening to RabbitMQ updates (no active subscriptions)');
  }

  /**
   * Increment subscription count for a marathon and subscribe to RabbitMQ if needed
   */
  private async incrementMarathonSubscription(marathonId: string) {
    const currentCount = this.marathonSubscriptionCount.get(marathonId) || 0;
    const newCount = currentCount + 1;
    
    this.marathonSubscriptionCount.set(marathonId, newCount);

    // If this is the first subscription to ANY marathon, start listening to updates
    if (!this.isListeningToUpdates) {
      this.startListeningToUpdates();
    }

    // If this is the first subscription to THIS marathon, subscribe to RabbitMQ
    if (currentCount === 0) {
      try {
        await this.liveAccountDataService.subscribeToMarathon(marathonId);
        this.logger.log(`📡 Subscribed to RabbitMQ for marathon ${marathonId}`);
      } catch (error) {
        this.logger.error(`Failed to subscribe to RabbitMQ for marathon ${marathonId}:`, error.message);
      }
    }
  }

  /**
   * Decrement subscription count for a marathon and unsubscribe from RabbitMQ if needed
   */
  private async decrementMarathonSubscription(marathonId: string) {
    const currentCount = this.marathonSubscriptionCount.get(marathonId) || 0;
    
    if (currentCount <= 0) {
      return; // Already at 0
    }

    const newCount = currentCount - 1;
    
    if (newCount <= 0) {
      this.marathonSubscriptionCount.delete(marathonId);
      
      // Unsubscribe from RabbitMQ for this marathon
      try {
        await this.liveAccountDataService.unsubscribeFromMarathon(marathonId);
        this.logger.log(`📴 Unsubscribed from RabbitMQ for marathon ${marathonId}`);
      } catch (error) {
        this.logger.error(`Failed to unsubscribe from RabbitMQ for marathon ${marathonId}:`, error.message);
      }

      // If no more marathons subscribed, stop listening to updates
      if (this.marathonSubscriptionCount.size === 0) {
        this.stopListeningToUpdates();
      }
    } else {
      this.marathonSubscriptionCount.set(marathonId, newCount);
    }
  }

  /**
   * Increment subscription count for a participant and subscribe to their marathon if needed
   */
  private async incrementParticipantSubscription(participantId: string) {
    const currentCount = this.participantSubscriptionCount.get(participantId) || 0;
    const newCount = currentCount + 1;
    
    this.participantSubscriptionCount.set(participantId, newCount);

    // If this is the first subscription to ANY participant, start listening to updates
    if (!this.isListeningToUpdates) {
      this.startListeningToUpdates();
    }

    // If this is the first subscription to THIS participant, subscribe to their marathon
    if (currentCount === 0) {
      try {
        // Get participant's marathon
        const participant = await this.marathonService.getParticipantById(participantId);
        if (participant && participant.marathon?.id) {
          await this.liveAccountDataService.subscribeToMarathon(participant.marathon.id);
          this.logger.log(`📡 Subscribed to RabbitMQ for participant ${participantId}'s marathon ${participant.marathon.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to subscribe to RabbitMQ for participant ${participantId}:`, error.message);
      }
    }
  }

  /**
   * Decrement subscription count for a participant and unsubscribe from marathon if needed
   */
  private async decrementParticipantSubscription(participantId: string) {
    const currentCount = this.participantSubscriptionCount.get(participantId) || 0;
    
    if (currentCount <= 0) {
      return; // Already at 0
    }

    const newCount = currentCount - 1;
    
    if (newCount <= 0) {
      this.participantSubscriptionCount.delete(participantId);
      
      // Check if any other participants or marathons still need this marathon subscription
      try {
        const participant = await this.marathonService.getParticipantById(participantId);
        if (participant && participant.marathon?.id) {
          // Only unsubscribe if no marathon subscribers AND no other participant subscribers for same marathon
          const hasMarathonSubscribers = this.marathonSubscriptionCount.has(participant.marathon.id);
          const hasOtherParticipants = await this.hasOtherParticipantsInMarathon(participant.marathon.id, participantId);
          
          if (!hasMarathonSubscribers && !hasOtherParticipants) {
            await this.liveAccountDataService.unsubscribeFromMarathon(participant.marathon.id);
            this.logger.log(`📴 Unsubscribed from RabbitMQ for participant ${participantId}'s marathon ${participant.marathon.id}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to unsubscribe from RabbitMQ for participant ${participantId}:`, error.message);
      }

      // If no more marathons or participants subscribed, stop listening to updates
      if (this.marathonSubscriptionCount.size === 0 && this.participantSubscriptionCount.size === 0) {
        this.stopListeningToUpdates();
      }
    } else {
      this.participantSubscriptionCount.set(participantId, newCount);
    }
  }

  /**
   * Check if there are other participants subscribed in the same marathon
   */
  private async hasOtherParticipantsInMarathon(marathonId: string, excludeParticipantId: string): Promise<boolean> {
    for (const [participantId, count] of this.participantSubscriptionCount.entries()) {
      if (participantId !== excludeParticipantId && count > 0) {
        try {
          const participant = await this.marathonService.getParticipantById(participantId);
          if (participant && participant.marathon?.id === marathonId) {
            return true;
          }
        } catch (error) {
          this.logger.warn(`Error checking participant ${participantId}:`, error.message);
        }
      }
    }
    return false;
  }

  /**
   * Get statistics about current subscriptions
   */
  getSubscriptionStats() {
    return {
      connectedClients: this.clientSubscriptions.size,
      activeMarathons: this.marathonSubscriptionCount.size,
      activeParticipants: this.participantSubscriptionCount.size,
      isListeningToRabbitMQ: this.isListeningToUpdates,
      marathonSubscriptions: Array.from(this.marathonSubscriptionCount.entries()).map(
        ([marathonId, count]) => ({ marathonId, subscribers: count })
      ),
      participantSubscriptions: Array.from(this.participantSubscriptionCount.entries()).map(
        ([participantId, count]) => ({ participantId, subscribers: count })
      ),
    };
  }

  private async handleAccountUpdate(snapshot: AccountSnapshot) {
    const snapshots = this.liveAccountDataService.getAllSnapshots();

    // Track which marathons need updates
    const marathonsToUpdate = new Set<string>();
    
    // Track which participants need updates
    const participantsToUpdate = new Set<string>();

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
      }
    }

    // For marathon subscriptions, check which marathons contain this account
    for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
      for (const marathonId of subscription.marathons) {
        const accountLogins = await this.leaderboardService.getMarathonAccountLogins(marathonId);
        
        if (accountLogins.includes(snapshot.login)) {
          marathonsToUpdate.add(marathonId);
        }
      }
    }

    // For participant subscriptions, check which participants own this account
    for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
      for (const participantId of subscription.participants) {
        try {
          const participant = await this.marathonService.getParticipantById(participantId);
          if (participant && participant.metaTraderAccount?.login === snapshot.login) {
            participantsToUpdate.add(participantId);
          }
        } catch (error) {
          this.logger.warn(`Error checking participant ${participantId}:`, error.message);
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

    // Send updates for affected participants
    for (const participantId of participantsToUpdate) {
      const entry = await this.leaderboardService.getAccountLeaderboardEntry(
        snapshot.login,
        snapshots,
      );

      if (entry) {
        // Send to all clients subscribed to this participant
        for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
          if (subscription.participants.has(participantId)) {
            this.server.to(clientId).emit('participant_update', {
              participantId,
              ...entry,
            });
          }
        }
      }
    }
  }
}

