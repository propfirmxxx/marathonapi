/**
 * RabbitMQ Connection Service
 * Manages connection lifecycle with reconnection logic
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQConfig, RABBITMQ_CONFIG } from '../config/rabbitmq.config';
import { RabbitMQConnectionException } from '../exceptions/rabbitmq.exception';

@Injectable()
export class RabbitMQConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConnectionService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(@Inject(RABBITMQ_CONFIG) private readonly config: RabbitMQConfig) {}

  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.warn('RabbitMQ is disabled via configuration');
      return;
    }
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Establish connection to RabbitMQ
   */
  async connect(attempt = 0): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.isConnected) {
      this.logger.debug('Already connected to RabbitMQ');
      return;
    }

    try {
      this.logger.log(`Connecting to RabbitMQ (attempt ${attempt + 1})...`);

      // Create connection
      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.heartbeat,
      });

      // Setup connection event handlers
      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
        void this.handleConnectionLoss();
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        void this.handleConnectionLoss();
      });

      // Create channel
      this.channel = await this.connection.createChannel();

      // Setup channel event handlers
      this.channel.on('error', (err) => {
        this.logger.error('RabbitMQ channel error', err);
      });

      this.channel.on('close', () => {
        this.logger.warn('RabbitMQ channel closed');
      });

      // Setup exchanges and queues
      await this.setupInfrastructure();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      this.logger.error(
        `Failed to connect to RabbitMQ (attempt ${attempt + 1}): ${error.message}`,
      );

      if (attempt < (this.config.connectionAttempts || 5)) {
        this.logger.log(`Retrying connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.connect(attempt + 1);
      } else {
        throw new RabbitMQConnectionException(
          `Failed to connect after ${attempt + 1} attempts`,
          error,
        );
      }
    }
  }

  /**
   * Setup exchanges, queues and bindings
   */
  private async setupInfrastructure(): Promise<void> {
    if (!this.channel) {
      throw new RabbitMQConnectionException('Channel not available');
    }

    // Main exchange for live data
    await this.channel.assertExchange(this.config.exchangeName, this.config.exchangeType, {
      durable: this.config.exchangeDurable,
    });
    this.logger.debug(`Declared exchange: ${this.config.exchangeName}`);

    // Dead letter exchange
    await this.channel.assertExchange(this.config.dlxExchangeName, 'topic', {
      durable: true,
    });
    this.logger.debug(`Declared dead letter exchange: ${this.config.dlxExchangeName}`);

    // Dead letter queue
    await this.channel.assertQueue(this.config.dlxQueueName, {
      durable: true,
    });
    await this.channel.bindQueue(
      this.config.dlxQueueName,
      this.config.dlxExchangeName,
      '#',
    );
    this.logger.debug(`Declared and bound dead letter queue: ${this.config.dlxQueueName}`);

    // Retry exchange
    await this.channel.assertExchange(this.config.retryExchangeName, 'topic', {
      durable: true,
    });
    this.logger.debug(`Declared retry exchange: ${this.config.retryExchangeName}`);

    // Retry queue with TTL
    await this.channel.assertQueue(this.config.retryQueueName, {
      durable: true,
      arguments: {
        'x-message-ttl': this.config.retryDelayMs,
        'x-dead-letter-exchange': this.config.exchangeName,
      },
    });
    await this.channel.bindQueue(
      this.config.retryQueueName,
      this.config.retryExchangeName,
      '#',
    );
    this.logger.debug(`Declared and bound retry queue: ${this.config.retryQueueName}`);
  }

  /**
   * Handle connection loss and attempt reconnection
   */
  private async handleConnectionLoss(): Promise<void> {
    if (!this.isConnected) {
      return; // Already handling reconnection
    }

    this.isConnected = false;
    this.connection = null;
    this.channel = null;

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Schedule reconnection
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.logger.log(`Scheduling reconnection in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      void this.connect();
    }, delay);
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.logger.log('Closed RabbitMQ channel');
      }
    } catch (error) {
      this.logger.warn(`Error closing channel: ${error.message}`);
    }

    try {
      if (this.connection) {
        await this.connection.close();
        this.logger.log('Closed RabbitMQ connection');
      }
    } catch (error) {
      this.logger.warn(`Error closing connection: ${error.message}`);
    }

    this.channel = null;
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Get the current channel
   */
  getChannel(): amqp.Channel {
    if (!this.channel || !this.isConnected) {
      throw new RabbitMQConnectionException('Not connected to RabbitMQ');
    }
    return this.channel;
  }

  /**
   * Check if connected
   */
  isHealthy(): boolean {
    return this.isConnected && this.channel !== null && this.connection !== null;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

