/**
 * Live Account Data Service - Updated to use new RabbitMQ module
 * This service integrates with the new RabbitMQ architecture
 */

import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter } from 'events';
import { ConsumeMessage } from 'amqplib';
import { RabbitMQConsumerService } from '../rabbitmq/services/rabbitmq-consumer.service';
import { RabbitMQHealthService } from '../rabbitmq/services/rabbitmq-health.service';
import { AccountSnapshot, MessageHandler } from '../rabbitmq/interfaces/message-handler.interface';
import { TokyoDataService } from '../tokyo-data/tokyo-data.service';

// Re-export for backward compatibility
export { AccountSnapshot } from '../rabbitmq/interfaces/message-handler.interface';

/**
 * Message handler for marathon account updates
 */
class MarathonMessageHandler implements MessageHandler {
  constructor(
    private readonly logger: Logger,
    private readonly snapshots: Map<string, AccountSnapshot>,
    private readonly eventEmitter: EventEmitter,
    private readonly tokyoDataService: TokyoDataService | null,
  ) {}

  async handle(message: ConsumeMessage, snapshot: AccountSnapshot): Promise<boolean> {
    try {
      const login = snapshot.login;

      // Store snapshot
      this.snapshots.set(login, snapshot);

      // Update database if available
      if (this.tokyoDataService) {
        await this.tokyoDataService.updateFromRabbitMQ(snapshot).catch((error) => {
          this.logger.warn(`Failed to update database for login ${login}: ${error.message}`);
        });
      }

      // Emit event for listeners
      this.eventEmitter.emit('account.update', snapshot);

      return true;
    } catch (error) {
      this.logger.error(`Failed to handle message: ${error.message}`);
      return false;
    }
  }
}

@Injectable()
export class LiveAccountDataService implements OnModuleInit {
  private readonly logger = new Logger(LiveAccountDataService.name);
  private readonly snapshots = new Map<string, AccountSnapshot>();
  private readonly eventEmitter = new EventEmitter();
  private readonly subscribedMarathons = new Set<string>();
  private tokyoDataService: TokyoDataService | null = null;

  constructor(
    private readonly consumerService: RabbitMQConsumerService,
    private readonly healthService: RabbitMQHealthService,
    @Inject(forwardRef(() => TokyoDataService))
    tokyoDataService?: TokyoDataService,
  ) {
    if (tokyoDataService) {
      this.tokyoDataService = tokyoDataService;
    }
  }

  async onModuleInit() {
    this.logger.log('LiveAccountDataService initialized with new RabbitMQ architecture');
  }

  /**
   * Subscribe to a marathon's live data
   */
  async subscribeToMarathon(marathonId: string): Promise<void> {
    if (this.subscribedMarathons.has(marathonId)) {
      this.logger.warn(`Already subscribed to marathon ${marathonId}`);
      return;
    }

    const handler = new MarathonMessageHandler(
      this.logger,
      this.snapshots,
      this.eventEmitter,
      this.tokyoDataService,
    );

    await this.consumerService.subscribeToMarathon(marathonId, handler);
    this.subscribedMarathons.add(marathonId);

    this.logger.log(`Subscribed to marathon ${marathonId}`);
  }

  /**
   * Unsubscribe from a marathon
   */
  async unsubscribeFromMarathon(marathonId: string): Promise<void> {
    if (!this.subscribedMarathons.has(marathonId)) {
      this.logger.warn(`Not subscribed to marathon ${marathonId}`);
      return;
    }

    await this.consumerService.unsubscribeFromMarathon(marathonId);
    this.subscribedMarathons.delete(marathonId);

    this.logger.log(`Unsubscribed from marathon ${marathonId}`);
  }

  /**
   * Get snapshot for a specific login
   */
  getSnapshot(login: string): AccountSnapshot | null {
    return this.snapshots.get(login) ?? null;
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): Map<string, AccountSnapshot> {
    return new Map(this.snapshots);
  }

  /**
   * Register callback for account updates
   */
  onAccountUpdate(callback: (snapshot: AccountSnapshot) => void): void {
    this.eventEmitter.on('account.update', callback);
  }

  /**
   * Remove account update listener
   */
  removeAccountUpdateListener(callback: (snapshot: AccountSnapshot) => void): void {
    this.eventEmitter.off('account.update', callback);
  }

  /**
   * Get health status
   */
  getHealth() {
    return this.healthService.getHealth();
  }

  /**
   * Get list of subscribed marathons
   */
  getSubscribedMarathons(): string[] {
    return Array.from(this.subscribedMarathons);
  }
}

