/**
 * RabbitMQ Consumer Service
 * Handles message consumption with dynamic queue management
 */

import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';
import { RabbitMQConfig, RABBITMQ_CONFIG } from '../config/rabbitmq.config';
import { QueueConfigBuilder } from '../config/queue.config';
import { AccountSnapshot, MessageHandler } from '../interfaces/message-handler.interface';
import { RabbitMQConsumeException, RabbitMQQueueException } from '../exceptions/rabbitmq.exception';

interface ConsumerInfo {
  queueName: string;
  consumerTag: string;
  marathonId: string;
}

@Injectable()
export class RabbitMQConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name);
  private readonly consumers = new Map<string, ConsumerInfo>();
  private readonly handlers = new Map<string, MessageHandler>();
  private messageCount = 0;
  private lastMessageTime: Date | null = null;

  constructor(
    private readonly connectionService: RabbitMQConnectionService,
    @Inject(RABBITMQ_CONFIG) private readonly config: RabbitMQConfig,
  ) {}

  async onModuleDestroy() {
    await this.stopAllConsumers();
  }

  /**
   * Subscribe to a specific marathon
   */
  async subscribeToMarathon(marathonId: string, handler: MessageHandler): Promise<void> {
    if (this.consumers.has(marathonId)) {
      this.logger.warn(`Already subscribed to marathon ${marathonId}`);
      return;
    }

    try {
      const channel = this.connectionService.getChannel();

      // Create queue for this marathon
      const queueConfig = QueueConfigBuilder.forMarathon(
        marathonId,
        this.config.dlxExchangeName,
        this.config.queueTtlMs,
        this.config.queueMaxLength,
      );

      await channel.assertQueue(queueConfig.name, {
        durable: queueConfig.durable,
        exclusive: queueConfig.exclusive,
        autoDelete: queueConfig.autoDelete,
        arguments: queueConfig.arguments,
      });

      // Bind queue to exchange with routing key pattern
      const routingKey = `marathon.${marathonId}.#`;
      await channel.bindQueue(queueConfig.name, this.config.exchangeName, routingKey);

      this.logger.log(
        `Bound queue ${queueConfig.name} to exchange ${this.config.exchangeName} with routing key ${routingKey}`,
      );

      // Set prefetch
      await channel.prefetch(this.config.prefetchCount);

      // Start consuming
      const { consumerTag } = await channel.consume(
        queueConfig.name,
        (msg) => this.handleMessage(msg, handler, marathonId),
        { noAck: this.config.noAck },
      );

      // Store consumer info
      this.consumers.set(marathonId, {
        queueName: queueConfig.name,
        consumerTag,
        marathonId,
      });

      this.handlers.set(marathonId, handler);

      this.logger.log(
        `Started consuming from queue ${queueConfig.name} for marathon ${marathonId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to subscribe to marathon ${marathonId}: ${error.message}`);
      throw new RabbitMQQueueException(`Failed to subscribe to marathon ${marathonId}`, error);
    }
  }

  /**
   * Unsubscribe from a marathon
   */
  async unsubscribeFromMarathon(marathonId: string): Promise<void> {
    const consumerInfo = this.consumers.get(marathonId);
    if (!consumerInfo) {
      this.logger.warn(`Not subscribed to marathon ${marathonId}`);
      return;
    }

    try {
      const channel = this.connectionService.getChannel();

      // Cancel consumer
      await channel.cancel(consumerInfo.consumerTag);
      this.logger.log(`Cancelled consumer for marathon ${marathonId}`);

      // Optionally delete the queue (comment out if you want to keep queues)
      // await channel.deleteQueue(consumerInfo.queueName);
      // this.logger.log(`Deleted queue ${consumerInfo.queueName}`);

      this.consumers.delete(marathonId);
      this.handlers.delete(marathonId);

      this.logger.log(`Unsubscribed from marathon ${marathonId}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from marathon ${marathonId}: ${error.message}`);
      throw new RabbitMQQueueException(
        `Failed to unsubscribe from marathon ${marathonId}`,
        error,
      );
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    msg: amqp.ConsumeMessage | null,
    handler: MessageHandler,
    marathonId: string,
  ): Promise<void> {
    if (!msg) {
      return;
    }

    this.messageCount++;
    this.lastMessageTime = new Date();

    const channel = this.connectionService.getChannel();
    const content = msg.content.toString().trim();

    if (!content) {
      channel.ack(msg);
      return;
    }

    // Get retry count from headers
    const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;

    // Split by newlines (batch support)
    const segments = content.split(/\s*\n+\s*/).filter((s) => s.length > 0);

    for (const segment of segments) {
      try {
        const payload = JSON.parse(segment);

        if (!payload?.login) {
          continue;
        }

        // Create snapshot
        const snapshot: AccountSnapshot = this.parseSnapshot(payload);

        // Call handler
        const success = await handler.handle(msg, snapshot);

        if (!success && retryCount < this.config.maxRetries) {
          // Retry logic
          await this.retryMessage(msg, retryCount + 1);
          channel.ack(msg);
          return;
        }
      } catch (error) {
        this.logger.error(
          `Failed to process message for marathon ${marathonId}: ${error.message}`,
        );

        if (retryCount < this.config.maxRetries) {
          // Retry
          await this.retryMessage(msg, retryCount + 1);
        } else {
          // Send to DLQ
          this.logger.error(`Max retries exceeded for message, sending to DLQ`);
        }

        channel.ack(msg);
        return;
      }
    }

    // Acknowledge message
    channel.ack(msg);
  }

  /**
   * Retry a failed message
   */
  private async retryMessage(msg: amqp.ConsumeMessage, retryCount: number): Promise<void> {
    try {
      const channel = this.connectionService.getChannel();

      // Publish to retry exchange with updated retry count
      await channel.publish(
        this.config.retryExchangeName,
        msg.fields.routingKey,
        msg.content,
        {
          ...msg.properties,
          headers: {
            ...msg.properties.headers,
            'x-retry-count': retryCount,
          },
        },
      );

      this.logger.debug(`Sent message to retry queue (attempt ${retryCount})`);
    } catch (error) {
      this.logger.error(`Failed to retry message: ${error.message}`);
    }
  }

  /**
   * Parse message payload into AccountSnapshot
   */
  private parseSnapshot(payload: any): AccountSnapshot {
    return {
      login: String(payload.login),
      marathon_id: payload.marathon_id,
      balance: payload.balance,
      equity: payload.equity,
      currency: payload.currency,
      leverage: payload.leverage,
      margin: payload.margin,
      freeMargin: payload.freeMargin,
      profit: payload.profit,
      positions: payload.positions,
      orders: payload.orders,
      updatedAt: new Date(),
      raw: payload,
    };
  }

  /**
   * Stop all consumers
   */
  async stopAllConsumers(): Promise<void> {
    const marathonIds = Array.from(this.consumers.keys());

    for (const marathonId of marathonIds) {
      try {
        await this.unsubscribeFromMarathon(marathonId);
      } catch (error) {
        this.logger.error(`Error stopping consumer for marathon ${marathonId}: ${error.message}`);
      }
    }
  }

  /**
   * Get active consumers
   */
  getActiveConsumers(): string[] {
    return Array.from(this.consumers.keys());
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeConsumers: this.consumers.size,
      messageCount: this.messageCount,
      lastMessageTime: this.lastMessageTime,
      consumers: Array.from(this.consumers.values()).map((c) => ({
        marathonId: c.marathonId,
        queueName: c.queueName,
      })),
    };
  }
}

