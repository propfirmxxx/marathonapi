/**
 * RabbitMQ Health Check Service
 * Provides health check functionality for monitoring
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { RabbitMQConnectionService } from './rabbitmq-connection.service';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';
import { RabbitMQConfig, RABBITMQ_CONFIG } from '../config/rabbitmq.config';

export interface RabbitMQHealthStatus {
  enabled: boolean;
  connected: boolean;
  exchangeName: string;
  activeConsumers: number;
  messageCount: number;
  lastMessageTime: Date | null;
  consumers: Array<{
    marathonId: string;
    queueName: string;
  }>;
}

@Injectable()
export class RabbitMQHealthService {
  private readonly logger = new Logger(RabbitMQHealthService.name);

  constructor(
    private readonly connectionService: RabbitMQConnectionService,
    private readonly consumerService: RabbitMQConsumerService,
    @Inject(RABBITMQ_CONFIG) private readonly config: RabbitMQConfig,
  ) {}

  /**
   * Get health status
   */
  getHealth(): RabbitMQHealthStatus {
    const consumerStats = this.consumerService.getStats();
    const connectionStats = this.connectionService.getStats();

    return {
      enabled: this.config.enabled,
      connected: this.connectionService.isHealthy(),
      exchangeName: this.config.exchangeName,
      activeConsumers: consumerStats.activeConsumers,
      messageCount: consumerStats.messageCount,
      lastMessageTime: consumerStats.lastMessageTime,
      consumers: consumerStats.consumers,
    };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.config.enabled ? this.connectionService.isHealthy() : true;
  }

  /**
   * Check if service is alive
   */
  isAlive(): boolean {
    return true; // Service is always alive if it's running
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    const health = this.getHealth();
    const connectionStats = this.connectionService.getStats();

    return {
      health,
      connection: connectionStats,
      config: {
        url: this.config.url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'), // Hide password
        exchangeName: this.config.exchangeName,
        exchangeType: this.config.exchangeType,
        prefetchCount: this.config.prefetchCount,
        maxRetries: this.config.maxRetries,
      },
    };
  }
}

