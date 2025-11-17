/**
 * Custom exceptions for RabbitMQ operations
 */

export class RabbitMQException extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'RabbitMQException';
  }
}

export class RabbitMQConnectionException extends RabbitMQException {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'RabbitMQConnectionException';
  }
}

export class RabbitMQPublishException extends RabbitMQException {
  constructor(message: string, cause?: Error) {
    super(message, 'PUBLISH_ERROR', cause);
    this.name = 'RabbitMQPublishException';
  }
}

export class RabbitMQConsumeException extends RabbitMQException {
  constructor(message: string, cause?: Error) {
    super(message, 'CONSUME_ERROR', cause);
    this.name = 'RabbitMQConsumeException';
  }
}

export class RabbitMQQueueException extends RabbitMQException {
  constructor(message: string, cause?: Error) {
    super(message, 'QUEUE_ERROR', cause);
    this.name = 'RabbitMQQueueException';
  }
}

