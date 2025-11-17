/**
 * Decorator for marking RabbitMQ message handlers
 */

import { SetMetadata } from '@nestjs/common';

export const RABBITMQ_HANDLER_METADATA = 'rabbitmq:handler';

export interface RabbitMQHandlerOptions {
  marathonId?: string;
  priority?: number;
}

export const RabbitMQHandler = (options?: RabbitMQHandlerOptions): MethodDecorator => {
  return SetMetadata(RABBITMQ_HANDLER_METADATA, options || {});
};

