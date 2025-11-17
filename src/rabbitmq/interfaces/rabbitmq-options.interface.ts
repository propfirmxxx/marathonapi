/**
 * Options for RabbitMQ module configuration
 */

import { ModuleMetadata, Type } from '@nestjs/common';
import { RabbitMQConfig } from '../config/rabbitmq.config';

export interface RabbitMQModuleOptions extends Partial<RabbitMQConfig> {
  url: string;
}

export interface RabbitMQOptionsFactory {
  createRabbitMQOptions(): Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
}

export interface RabbitMQModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<RabbitMQOptionsFactory>;
  useClass?: Type<RabbitMQOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<RabbitMQModuleOptions> | RabbitMQModuleOptions;
  inject?: any[];
}

