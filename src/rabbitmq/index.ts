/**
 * RabbitMQ Module Exports
 */

// Module
export { RabbitMQModule } from './rabbitmq.module';

// Config
export { RabbitMQConfig, RABBITMQ_CONFIG, defaultRabbitMQConfig } from './config/rabbitmq.config';
export { QueueConfigBuilder } from './config/queue.config';

// Services
export { RabbitMQConnectionService } from './services/rabbitmq-connection.service';
export { RabbitMQConsumerService } from './services/rabbitmq-consumer.service';
export { RabbitMQHealthService, RabbitMQHealthStatus } from './services/rabbitmq-health.service';

// Interfaces
export {
  AccountSnapshot,
  MessageHandler,
  MessageContext,
} from './interfaces/message-handler.interface';
export {
  RabbitMQModuleOptions,
  RabbitMQOptionsFactory,
  RabbitMQModuleAsyncOptions,
} from './interfaces/rabbitmq-options.interface';

// Exceptions
export {
  RabbitMQException,
  RabbitMQConnectionException,
  RabbitMQPublishException,
  RabbitMQConsumeException,
  RabbitMQQueueException,
} from './exceptions/rabbitmq.exception';

// Decorators
export { RabbitMQHandler, RabbitMQHandlerOptions } from './decorators/rabbitmq-handler.decorator';

