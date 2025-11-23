/**
 * RabbitMQ Configuration
 * Provides connection and behavior settings for RabbitMQ
 */

export const RABBITMQ_CONFIG = 'RABBITMQ_CONFIG';

export interface RabbitMQConfig {
  // Connection settings
  url: string;
  heartbeat?: number;
  connectionAttempts?: number;
  retryDelay?: number;

  // Exchange settings
  exchangeName: string;
  exchangeType: 'direct' | 'topic' | 'fanout' | 'headers';
  exchangeDurable: boolean;

  // Dead letter exchange
  dlxExchangeName: string;
  dlxQueueName: string;

  // Retry settings
  retryExchangeName: string;
  retryQueueName: string;
  retryDelayMs: number;
  maxRetries: number;

  // Consumer settings
  prefetchCount: number;
  noAck: boolean;

  // Queue settings
  queueTtlMs: number;
  queueMaxLength: number;

  // Feature flags
  enabled: boolean;
}

export const defaultRabbitMQConfig: Partial<RabbitMQConfig> = {
  heartbeat: 60,
  connectionAttempts: 5,
  retryDelay: 3000,

  exchangeName: 'marathon.live.exchange',
  exchangeType: 'topic',
  exchangeDurable: true,

  dlxExchangeName: 'marathon.dlx',
  dlxQueueName: 'marathon_dead_letter',

  retryExchangeName: 'marathon.retry.exchange',
  retryQueueName: 'marathon_retry',
  retryDelayMs: 5000,
  maxRetries: 3,

  prefetchCount: 10,
  noAck: false,

  queueTtlMs: 60000,
  queueMaxLength: 10000,

  enabled: true,
};

