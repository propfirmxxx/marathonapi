/**
 * Interface for RabbitMQ message handlers
 */

import { ConsumeMessage } from 'amqplib';

export interface AccountSnapshot {
  login: string;
  marathon_id?: string;
  balance?: number;
  equity?: number;
  currency?: string;
  leverage?: number;
  margin?: number;
  freeMargin?: number;
  profit?: number;
  positions?: any[];
  orders?: any[];
  updatedAt: Date;
  raw?: Record<string, any>;
}

export interface MessageHandler {
  /**
   * Handle a message from RabbitMQ
   * @param message The raw message from RabbitMQ
   * @param snapshot The parsed account snapshot
   * @returns true if message was handled successfully, false otherwise
   */
  handle(message: ConsumeMessage, snapshot: AccountSnapshot): Promise<boolean>;
}

export interface MessageContext {
  routingKey: string;
  exchange: string;
  redelivered: boolean;
  retryCount: number;
  headers: Record<string, any>;
}

