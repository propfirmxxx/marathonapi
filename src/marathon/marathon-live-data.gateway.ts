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
  participants: Set<string>; // participant IDs
  myLive: Map<string, string>; // marathonId -> participantId
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/marathon-live',
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

  // Track active my-live subscriptions (reference counting)
  private myLiveSubscriptionCount = new Map<string, number>(); // marathonId -> count
  
  // Track if we're listening to RabbitMQ updates
  private isListeningToUpdates = false;
  private accountUpdateHandler: ((snapshot: AccountSnapshot) => void) | null = null;

  // Batching mechanism for marathon updates (200ms intervals)
  private marathonUpdateBatches = new Map<string, Set<string>>(); // marathonId -> Set<participantId>
  private batchTimers = new Map<string, NodeJS.Timeout>(); // marathonId -> timer
  private readonly BATCH_INTERVAL_MS = 200;

  // Cache for analysis data (TTL: 5 seconds)
  private analysisCache = new Map<string, { data: any; timestamp: number }>(); // participantId -> cached data
  private readonly ANALYSIS_CACHE_TTL_MS = 5000;

  // Track previous snapshot state for diff calculation
  private previousSnapshots = new Map<string, { balance?: number; equity?: number; profit?: number }>(); // participantId -> previous values

  // Track positions/orders changes
  private previousPositions = new Map<string, any[]>(); // accountLogin -> positions array
  private previousOrders = new Map<string, any[]>(); // accountLogin -> orders array

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
        participants: new Set(),
        myLive: new Map(),
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
        `Participants: ${subscription.participants.size}, ` +
        `MyLive: ${subscription.myLive.size})`,
      );
      
      // Unsubscribe from all marathons this client was subscribed to
      for (const marathonId of subscription.marathons) {
        await this.decrementMarathonSubscription(marathonId);
      }
      
      // Unsubscribe from all participants this client was subscribed to
      for (const participantId of subscription.participants) {
        await this.decrementParticipantSubscription(participantId);
      }

      // Unsubscribe from all my-live subscriptions
      for (const [marathonId, participantId] of subscription.myLive.entries()) {
        await this.decrementMyLiveSubscription(marathonId);
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

      // Send initial batched update with all current participants
      await this.sendInitialMarathonUpdate(client, data.marathonId);

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

      // Get participant info and send initial analysis data
      const participant = await this.marathonService.getParticipantById(data.participantId);
      if (!participant) {
        client.emit('error', { message: 'Participant not found' });
        return;
      }

      // Send initial analysis data
      await this.sendParticipantAnalysis(client, data.participantId, participant.marathon.id);

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

  @SubscribeMessage('subscribe_my_live')
  async handleSubscribeMyLive(
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
      if (subscription.myLive.has(data.marathonId)) {
        this.logger.debug(`Client ${client.id} already subscribed to my-live for marathon ${data.marathonId}`);
        return;
      }

      // Get user's participant in this marathon
      const participant = await this.marathonService.getParticipantByUserInMarathon(
        data.marathonId,
        subscription.userId,
      );

      if (!participant) {
        client.emit('error', { message: 'You are not a participant in this marathon' });
        return;
      }

      subscription.myLive.set(data.marathonId, participant.id);

      // Increment subscription count and subscribe to marathon if needed
      await this.incrementMyLiveSubscription(data.marathonId);

      this.logger.log(
        `Client ${client.id} subscribed to my-live for marathon ${data.marathonId} ` +
        `(participant: ${participant.id}, total subscribers: ${this.myLiveSubscriptionCount.get(data.marathonId) || 0})`
      );

      // Send initial analysis data
      await this.sendParticipantAnalysis(client, participant.id, data.marathonId);

      // Send initial positions/orders if available
      const accountLogin = participant.metaTraderAccount?.login;
      if (accountLogin) {
        const snapshot = this.liveAccountDataService.getSnapshot(accountLogin);
        if (snapshot) {
          if (snapshot.positions && snapshot.positions.length > 0) {
            client.emit('my_live_positions_update', {
              marathonId: data.marathonId,
              participantId: participant.id,
              positions: snapshot.positions,
              timestamp: snapshot.updatedAt,
            });
          }

          if (snapshot.orders && snapshot.orders.length > 0) {
            client.emit('my_live_orders_update', {
              marathonId: data.marathonId,
              participantId: participant.id,
              orders: snapshot.orders,
              timestamp: snapshot.updatedAt,
            });
          }
        }
      }

      client.emit('subscribed', { 
        type: 'my_live', 
        marathonId: data.marathonId,
        participantId: participant.id,
        message: `Subscribed to my-live for marathon ${data.marathonId}`,
      });
    } catch (error) {
      this.logger.error(`Error subscribing to my-live:`, error.message);
      client.emit('error', { message: 'Failed to subscribe to my-live' });
    }
  }

  @SubscribeMessage('unsubscribe_my_live')
  async handleUnsubscribeMyLive(
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

    if (!subscription.myLive.has(data.marathonId)) {
      return; // Not subscribed
    }

    subscription.myLive.delete(data.marathonId);

    // Decrement subscription count
    await this.decrementMyLiveSubscription(data.marathonId);

    this.logger.log(
      `Client ${client.id} unsubscribed from my-live for marathon ${data.marathonId} ` +
      `(remaining subscribers: ${this.myLiveSubscriptionCount.get(data.marathonId) || 0})`
    );

    client.emit('unsubscribed', { 
      type: 'my_live', 
      marathonId: data.marathonId,
      message: `Unsubscribed from my-live for marathon ${data.marathonId}`,
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
      
      // Clean up batch timer if exists
      this.cleanupBatchTimer(marathonId);
      
      // Unsubscribe from RabbitMQ for this marathon
      try {
        await this.liveAccountDataService.unsubscribeFromMarathon(marathonId);
        this.logger.log(`📴 Unsubscribed from RabbitMQ for marathon ${marathonId}`);
      } catch (error) {
        this.logger.error(`Failed to unsubscribe from RabbitMQ for marathon ${marathonId}:`, error.message);
      }

      // If no more marathons subscribed, stop listening to updates
      if (this.marathonSubscriptionCount.size === 0 && this.myLiveSubscriptionCount.size === 0 && this.participantSubscriptionCount.size === 0) {
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
      
      // Check if any other participants, marathons, or my-live subscriptions still need this marathon
      try {
        const participant = await this.marathonService.getParticipantById(participantId);
        if (participant && participant.marathon?.id) {
          const marathonId = participant.marathon.id;
          // Only unsubscribe if no marathon subscribers AND no other participant subscribers AND no my-live subscribers for same marathon
          const hasMarathonSubscribers = this.marathonSubscriptionCount.has(marathonId);
          const hasOtherParticipants = await this.hasOtherParticipantsInMarathon(marathonId, participantId);
          const hasMyLiveSubscribers = this.myLiveSubscriptionCount.has(marathonId);
          
          if (!hasMarathonSubscribers && !hasOtherParticipants && !hasMyLiveSubscribers) {
            await this.liveAccountDataService.unsubscribeFromMarathon(marathonId);
            this.cleanupBatchTimer(marathonId);
            this.logger.log(`📴 Unsubscribed from RabbitMQ for participant ${participantId}'s marathon ${marathonId}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to unsubscribe from RabbitMQ for participant ${participantId}:`, error.message);
      }

      // If no more marathons or participants subscribed, stop listening to updates
      if (this.marathonSubscriptionCount.size === 0 && this.participantSubscriptionCount.size === 0 && this.myLiveSubscriptionCount.size === 0) {
        this.stopListeningToUpdates();
      }
    } else {
      this.participantSubscriptionCount.set(participantId, newCount);
    }
  }

  /**
   * Increment subscription count for my-live and subscribe to marathon if needed
   */
  private async incrementMyLiveSubscription(marathonId: string) {
    const currentCount = this.myLiveSubscriptionCount.get(marathonId) || 0;
    const newCount = currentCount + 1;
    
    this.myLiveSubscriptionCount.set(marathonId, newCount);

    // If this is the first subscription to ANY my-live, start listening to updates
    if (!this.isListeningToUpdates) {
      this.startListeningToUpdates();
    }

    // If this is the first subscription to THIS marathon for my-live, subscribe to RabbitMQ
    if (currentCount === 0) {
      try {
        await this.liveAccountDataService.subscribeToMarathon(marathonId);
        this.logger.log(`📡 Subscribed to RabbitMQ for my-live marathon ${marathonId}`);
      } catch (error) {
        this.logger.error(`Failed to subscribe to RabbitMQ for my-live marathon ${marathonId}:`, error.message);
      }
    }
  }

  /**
   * Decrement subscription count for my-live and unsubscribe from marathon if needed
   */
  private async decrementMyLiveSubscription(marathonId: string) {
    const currentCount = this.myLiveSubscriptionCount.get(marathonId) || 0;
    
    if (currentCount <= 0) {
      return; // Already at 0
    }

    const newCount = currentCount - 1;
    
    if (newCount <= 0) {
      this.myLiveSubscriptionCount.delete(marathonId);
      
      // Check if any other subscriptions still need this marathon
      const hasMarathonSubscribers = this.marathonSubscriptionCount.has(marathonId);
      const hasParticipantSubscribers = await this.hasParticipantsInMarathon(marathonId);
      
      if (!hasMarathonSubscribers && !hasParticipantSubscribers) {
        try {
          await this.liveAccountDataService.unsubscribeFromMarathon(marathonId);
          this.logger.log(`📴 Unsubscribed from RabbitMQ for my-live marathon ${marathonId}`);
        } catch (error) {
          this.logger.error(`Failed to unsubscribe from RabbitMQ for my-live marathon ${marathonId}:`, error.message);
        }
      }

      // If no more subscriptions, stop listening to updates
      if (this.marathonSubscriptionCount.size === 0 && this.participantSubscriptionCount.size === 0 && this.myLiveSubscriptionCount.size === 0) {
        this.stopListeningToUpdates();
      }
    } else {
      this.myLiveSubscriptionCount.set(marathonId, newCount);
    }
  }

  /**
   * Check if there are participant subscribers in a marathon
   */
  private async hasParticipantsInMarathon(marathonId: string): Promise<boolean> {
    for (const [participantId, count] of this.participantSubscriptionCount.entries()) {
      if (count > 0) {
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
   * Clean up batch timer for a marathon
   */
  private cleanupBatchTimer(marathonId: string): void {
    const timer = this.batchTimers.get(marathonId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(marathonId);
    }
    this.marathonUpdateBatches.delete(marathonId);
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
      activeMyLive: this.myLiveSubscriptionCount.size,
      isListeningToRabbitMQ: this.isListeningToUpdates,
      marathonSubscriptions: Array.from(this.marathonSubscriptionCount.entries()).map(
        ([marathonId, count]) => ({ marathonId, subscribers: count })
      ),
      participantSubscriptions: Array.from(this.participantSubscriptionCount.entries()).map(
        ([participantId, count]) => ({ participantId, subscribers: count })
      ),
      myLiveSubscriptions: Array.from(this.myLiveSubscriptionCount.entries()).map(
        ([marathonId, count]) => ({ marathonId, subscribers: count })
      ),
      activeBatchTimers: this.batchTimers.size,
    };
  }

  private async handleAccountUpdate(snapshot: AccountSnapshot) {
    const snapshots = this.liveAccountDataService.getAllSnapshots();

    // Check for positions/orders changes for my-live subscriptions
    await this.checkPositionsOrdersChanges(snapshot);

    // Get participant info for this account to track changes
    const participant = await this.leaderboardService.getParticipantByAccountLogin(snapshot.login);
    if (!participant) {
      return; // Account is not part of any marathon
    }

    const participantId = participant.participantId;
    const marathonId = participant.marathonId;

    // Track marathon updates for batching
    if (marathonId && this.marathonSubscriptionCount.has(marathonId)) {
      // Check if values actually changed (diff calculation)
      const previous = this.previousSnapshots.get(participantId);
      const hasChanged = !previous ||
        previous.balance !== snapshot.balance ||
        previous.equity !== snapshot.equity ||
        previous.profit !== snapshot.profit;

      if (hasChanged) {
        // Update previous snapshot
        this.previousSnapshots.set(participantId, {
          balance: snapshot.balance,
          equity: snapshot.equity,
          profit: snapshot.profit,
        });

        // Add to batch
        this.addParticipantToBatch(marathonId, participantId);
      }
    }

    // Handle participant subscriptions (analysis updates)
    const hasParticipantSubscribers = this.participantSubscriptionCount.has(participantId);
    if (hasParticipantSubscribers) {
      await this.sendParticipantAnalysisToSubscribers(participantId, marathonId);
    }

    // Handle my-live subscriptions - send analysis update
    if (this.myLiveSubscriptionCount.has(marathonId)) {
      // Clear cache to force refresh
      this.analysisCache.delete(participantId);
      await this.sendMyLiveAnalysisToSubscribers(marathonId, participantId);
    }
  }

  /**
   * Check if positions or orders have changed and notify my-live subscribers
   */
  private async checkPositionsOrdersChanges(snapshot: AccountSnapshot): Promise<void> {
    const previousPos = this.previousPositions.get(snapshot.login);
    const previousOrd = this.previousOrders.get(snapshot.login);
    const currentPos = snapshot.positions || [];
    const currentOrd = snapshot.orders || [];

    // Initialize if first time seeing this account
    if (previousPos === undefined) {
      this.previousPositions.set(snapshot.login, currentPos);
      this.previousOrders.set(snapshot.login, currentOrd);
      return; // First time, no change to report
    }

    // Compare arrays (simple JSON comparison)
    const positionsChanged = JSON.stringify(previousPos) !== JSON.stringify(currentPos);
    const ordersChanged = JSON.stringify(previousOrd) !== JSON.stringify(currentOrd);

    // Update cached values
    this.previousPositions.set(snapshot.login, currentPos);
    this.previousOrders.set(snapshot.login, currentOrd);

    if (!positionsChanged && !ordersChanged) {
      return; // No changes
    }

    // Find participant and marathon for this account
    const participant = await this.leaderboardService.getParticipantByAccountLogin(snapshot.login);
    if (!participant) {
      return;
    }

    const marathonId = participant.marathonId;

    // Send updates to my-live subscribers
    if (this.myLiveSubscriptionCount.has(marathonId)) {
      for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
        if (subscription.myLive.has(marathonId)) {
          const subscriberParticipantId = subscription.myLive.get(marathonId);
          
          // Only send if this is the subscriber's own account
          if (subscriberParticipantId === participant.participantId) {
            if (positionsChanged) {
              this.server.to(clientId).emit('my_live_positions_update', {
                marathonId,
                participantId: participant.participantId,
                positions: currentPos,
                timestamp: snapshot.updatedAt,
              });
            }

            if (ordersChanged) {
              this.server.to(clientId).emit('my_live_orders_update', {
                marathonId,
                participantId: participant.participantId,
                orders: currentOrd,
                timestamp: snapshot.updatedAt,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Add participant to batch for marathon update
   */
  private addParticipantToBatch(marathonId: string, participantId: string): void {
    if (!this.marathonUpdateBatches.has(marathonId)) {
      this.marathonUpdateBatches.set(marathonId, new Set());
    }
    this.marathonUpdateBatches.get(marathonId)!.add(participantId);

    // Schedule batch update if not already scheduled
    if (!this.batchTimers.has(marathonId)) {
      this.scheduleMarathonBatchUpdate(marathonId);
    }
  }

  /**
   * Schedule a batched marathon update (200ms)
   */
  private scheduleMarathonBatchUpdate(marathonId: string): void {
    const timer = setTimeout(() => {
      this.sendMarathonBatchUpdate(marathonId);
      this.batchTimers.delete(marathonId);
    }, this.BATCH_INTERVAL_MS);

    this.batchTimers.set(marathonId, timer);
  }

  /**
   * Send batched marathon updates (diff format)
   */
  private async sendMarathonBatchUpdate(marathonId: string): Promise<void> {
    const changedParticipantIds = this.marathonUpdateBatches.get(marathonId);
    if (!changedParticipantIds || changedParticipantIds.size === 0) {
      return;
    }

    // Clear the batch
    this.marathonUpdateBatches.set(marathonId, new Set());

    // Get snapshots
    const snapshots = this.liveAccountDataService.getAllSnapshots();

    // Get marathon participants mapping
    const accountLogins = await this.leaderboardService.getMarathonAccountLogins(marathonId);
    const participantMap = new Map<string, string>(); // accountLogin -> participantId

    // Build participant updates (diff format)
    const participantsUpdate: Array<{
      participantId: string;
      equity?: number;
      balance?: number;
      profit?: number;
      timestamp: Date;
    }> = [];

    for (const participantId of changedParticipantIds) {
      // Find account login for this participant
      const participant = await this.marathonService.getParticipantById(participantId);
      if (!participant?.metaTraderAccount?.login) {
        continue;
      }

      const accountLogin = participant.metaTraderAccount.login;
      const snapshot = snapshots.get(accountLogin);
      if (!snapshot) {
        continue;
      }

      const previous = this.previousSnapshots.get(participantId);
      const update: any = {
        participantId,
        timestamp: snapshot.updatedAt,
      };

      // Only include changed fields (diff format)
      if (previous?.balance !== snapshot.balance) {
        update.balance = snapshot.balance;
      }
      if (previous?.equity !== snapshot.equity) {
        update.equity = snapshot.equity;
      }
      if (previous?.profit !== snapshot.profit) {
        update.profit = snapshot.profit;
      }

      participantsUpdate.push(update);
    }

    if (participantsUpdate.length === 0) {
      return;
    }

    // Send to all clients subscribed to this marathon
    for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
      if (subscription.marathons.has(marathonId)) {
        this.server.to(clientId).emit('marathon_participants_update', {
          type: 'marathon_participants_update',
          marathonId,
          participants: participantsUpdate,
        });
      }
    }
  }

  /**
   * Send participant analysis to a specific client
   */
  private async sendParticipantAnalysis(
    client: Socket,
    participantId: string,
    marathonId: string,
  ): Promise<void> {
    try {
      const analysis = await this.getCachedAnalysis(participantId, marathonId);
      if (analysis) {
        client.emit('participant_analysis', {
          type: 'participant_analysis',
          participantId,
          data: analysis,
        });
      }
    } catch (error) {
      this.logger.error(`Error sending participant analysis:`, error.message);
    }
  }

  /**
   * Send participant analysis to all subscribers
   */
  private async sendParticipantAnalysisToSubscribers(
    participantId: string,
    marathonId: string,
  ): Promise<void> {
    try {
      const analysis = await this.getCachedAnalysis(participantId, marathonId);
      if (!analysis) {
        return;
      }

      for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
        if (subscription.participants.has(participantId)) {
          this.server.to(clientId).emit('participant_analysis', {
            type: 'participant_analysis',
            participantId,
            data: analysis,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error sending participant analysis to subscribers:`, error.message);
    }
  }

  /**
   * Send my-live analysis to all subscribers
   */
  private async sendMyLiveAnalysisToSubscribers(
    marathonId: string,
    participantId: string,
  ): Promise<void> {
    try {
      // Clear cache to get fresh data
      this.analysisCache.delete(participantId);
      const analysis = await this.getCachedAnalysis(participantId, marathonId);
      if (!analysis) {
        return;
      }

      for (const [clientId, subscription] of this.clientSubscriptions.entries()) {
        if (subscription.myLive.has(marathonId)) {
          const subscriberParticipantId = subscription.myLive.get(marathonId);
          // Send to clients who are subscribed to my-live for this marathon
          // Only send if it's their own participant ID
          if (subscriberParticipantId === participantId) {
            this.server.to(clientId).emit('my_live_analysis', {
              type: 'my_live_analysis',
              marathonId,
              participantId,
              data: analysis,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error sending my-live analysis:`, error.message);
    }
  }

  /**
   * Send initial marathon update with all current participants
   */
  private async sendInitialMarathonUpdate(client: Socket, marathonId: string): Promise<void> {
    try {
      const snapshots = this.liveAccountDataService.getAllSnapshots();
      const accountLogins = await this.leaderboardService.getMarathonAccountLogins(marathonId);
      
      const participantsUpdate: Array<{
        participantId: string;
        equity?: number;
        balance?: number;
        profit?: number;
        timestamp: Date;
      }> = [];

      for (const accountLogin of accountLogins) {
        const participant = await this.leaderboardService.getParticipantByAccountLogin(accountLogin);
        if (!participant) {
          continue;
        }

        const snapshot = snapshots.get(accountLogin);
        if (!snapshot) {
          continue;
        }

        participantsUpdate.push({
          participantId: participant.participantId,
          equity: snapshot.equity,
          balance: snapshot.balance,
          profit: snapshot.profit,
          timestamp: snapshot.updatedAt,
        });
      }

      if (participantsUpdate.length > 0) {
        client.emit('marathon_participants_update', {
          type: 'marathon_participants_update',
          marathonId,
          participants: participantsUpdate,
        });
      }
    } catch (error) {
      this.logger.error(`Error sending initial marathon update:`, error.message);
    }
  }

  /**
   * Get cached analysis or fetch new one
   */
  private async getCachedAnalysis(participantId: string, marathonId: string): Promise<any> {
    const cached = this.analysisCache.get(participantId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.ANALYSIS_CACHE_TTL_MS) {
      return cached.data;
    }

    // Fetch fresh analysis
    try {
      const analysis = await this.marathonService.getParticipantLiveAnalysis(
        marathonId,
        participantId,
        false, // isPublic
      );

      // Cache it
      this.analysisCache.set(participantId, {
        data: analysis,
        timestamp: now,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Error fetching analysis for participant ${participantId}:`, error.message);
      return null;
    }
  }
}

