import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EventEmitter } from 'events';

export interface AccountSnapshot {
  login: string;
  balance?: number;
  equity?: number;
  currency?: string;
  leverage?: number;
  margin?: number;
  freeMargin?: number;
  profit?: number;
  updatedAt: Date;
  positions?: any[];
  orders?: any[];
  raw?: Record<string, any>;
}

@Injectable()
export class LiveAccountDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveAccountDataService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly queue: string;
  private readonly url: string;
  private readonly enabled: boolean;
  private readonly snapshots = new Map<string, AccountSnapshot>();
  private readonly eventEmitter = new EventEmitter();
  private messageCount = 0;
  private lastMessageTime: Date | null = null;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/');
    this.queue = this.configService.get<string>('RABBITMQ_QUEUE', 'socket_data');
    this.enabled = this.configService.get<string>('RABBITMQ_ENABLED', 'true').toLowerCase() === 'true';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('RabbitMQ is disabled via RABBITMQ_ENABLED environment variable');
      return;
    }
    await this.connect();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  getSnapshot(login: string): AccountSnapshot | null {
    return this.snapshots.get(login) ?? null;
  }

  getAllSnapshots(): Map<string, AccountSnapshot> {
    return new Map(this.snapshots);
  }

  onAccountUpdate(callback: (snapshot: AccountSnapshot) => void): void {
    this.eventEmitter.on('account.update', callback);
  }

  removeAccountUpdateListener(callback: (snapshot: AccountSnapshot) => void): void {
    this.eventEmitter.off('account.update', callback);
  }

  getHealth(): {
    enabled: boolean;
    connected: boolean;
    queueName: string;
    messageCount: number;
    snapshotCount: number;
    lastMessageTime: Date | null;
  } {
    return {
      enabled: this.enabled,
      connected: this.enabled && this.connection !== null && this.channel !== null,
      queueName: this.queue,
      messageCount: this.messageCount,
      snapshotCount: this.snapshots.size,
      lastMessageTime: this.lastMessageTime,
    };
  }

  private async connect(attempt = 0): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (!this.url) {
      this.logger.warn('RABBITMQ_URL not configured, live data will be unavailable.');
      return;
    }

    try {
      const connection = (await amqp.connect(this.url)) as unknown as amqp.ChannelModel;
      this.connection = connection;
      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
        void this.reconnect();
      });
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting reconnect');
        void this.reconnect();
      });

      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queue, { durable: true });

      await this.channel.consume(this.queue, (message) => this.handleMessage(message), { noAck: true });

      this.logger.log(`Connected to RabbitMQ queue "${this.queue}"`);
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      this.logger.error(`Failed to connect to RabbitMQ (${attempt + 1}): ${error.message}`);
      setTimeout(() => {
        void this.connect(attempt + 1);
      }, delay);
    }
  }

  private async reconnect() {
    if (!this.enabled) {
      return;
    }
    await this.closeConnection();
    await this.connect();
  }

  private async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      this.logger.error('Error closing RabbitMQ resources', error);
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }

  private handleMessage(message: amqp.ConsumeMessage | null) {
    if (!message) {
      return;
    }

    const content = message.content.toString().trim();
    if (!content) {
      return;
    }

    this.messageCount++;
    this.lastMessageTime = new Date();

    const segments = content.split(/\s*\n+\s*/).filter((segment) => segment.length > 0);

    for (const segment of segments) {
      try {
        const payload = JSON.parse(segment);

        if (!payload?.login) {
          continue;
        }

        const login = String(payload.login);
        const existing = this.snapshots.get(login);
        const snapshot: AccountSnapshot = this.mergeSnapshot(existing, payload);

        this.snapshots.set(login, snapshot);
        
        // Emit event for listeners
        this.eventEmitter.emit('account.update', snapshot);
      } catch (error) {
        this.logger.warn(`Failed to process RabbitMQ payload "${segment}": ${error.message}`);
      }
    }
  }

  private mergeSnapshot(existing: AccountSnapshot | undefined, payload: any): AccountSnapshot {
    const base: AccountSnapshot = existing ?? {
      login: String(payload.login),
      updatedAt: new Date(),
    };

    switch (payload.type) {
      case 'account':
      case 'update':
        return {
          ...base,
          login: String(payload.login),
          balance: payload.balance ?? base.balance,
          equity: payload.equity ?? base.equity,
          currency: payload.currency ?? base.currency,
          leverage: payload.leverage ?? base.leverage,
          margin: payload.margin ?? base.margin,
          freeMargin: payload.freeMargin ?? base.freeMargin,
          profit: payload.profit ?? base.profit,
          positions: payload.positions ?? base.positions,
          updatedAt: new Date(),
          raw: { ...(base.raw ?? {}), ...payload },
        };
      case 'positions':
        return {
          ...base,
          positions: payload.positions,
          updatedAt: new Date(),
          raw: { ...(base.raw ?? {}), positions: payload.positions },
        };
      case 'orders':
        return {
          ...base,
          orders: payload.orders,
          updatedAt: new Date(),
          raw: { ...(base.raw ?? {}), orders: payload.orders },
        };
      default:
        return {
          ...base,
          raw: { ...(base.raw ?? {}), ...payload },
          updatedAt: new Date(),
        };
    }
  }
}

