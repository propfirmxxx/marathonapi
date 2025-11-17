/**
 * Queue configuration for different marathon scenarios
 */

export interface QueueConfig {
  name: string;
  durable: boolean;
  exclusive: boolean;
  autoDelete: boolean;
  arguments?: Record<string, any>;
}

export class QueueConfigBuilder {
  /**
   * Build queue configuration for a specific marathon
   */
  static forMarathon(marathonId: string, dlxExchange: string, ttl: number, maxLength: number): QueueConfig {
    return {
      name: `marathon_${marathonId}_live`,
      durable: true,
      exclusive: false,
      autoDelete: false,
      arguments: {
        'x-message-ttl': ttl,
        'x-max-length': maxLength,
        'x-dead-letter-exchange': dlxExchange,
        'x-overflow': 'reject-publish',
      },
    };
  }

  /**
   * Build queue configuration for monitoring all marathons
   */
  static forMonitoring(dlxExchange: string, ttl: number): QueueConfig {
    return {
      name: 'all_marathons_monitor',
      durable: true,
      exclusive: false,
      autoDelete: false,
      arguments: {
        'x-message-ttl': ttl,
        'x-dead-letter-exchange': dlxExchange,
      },
    };
  }

  /**
   * Build dead letter queue configuration
   */
  static forDeadLetter(): QueueConfig {
    return {
      name: 'marathon_dead_letter',
      durable: true,
      exclusive: false,
      autoDelete: false,
    };
  }

  /**
   * Build retry queue configuration
   */
  static forRetry(retryDelayMs: number, targetExchange: string): QueueConfig {
    return {
      name: 'marathon_retry',
      durable: true,
      exclusive: false,
      autoDelete: false,
      arguments: {
        'x-message-ttl': retryDelayMs,
        'x-dead-letter-exchange': targetExchange,
      },
    };
  }
}

