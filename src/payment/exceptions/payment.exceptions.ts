import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

export class PaymentNotFoundException extends NotFoundException {
  constructor(paymentId?: string) {
    super(paymentId ? `Payment with ID ${paymentId} not found` : 'Payment not found');
  }
}

export class InvalidPaymentStatusException extends BadRequestException {
  constructor(status: string) {
    super(`Invalid payment status: ${status}`);
  }
}

export class WebhookVerificationException extends ForbiddenException {
  constructor(message = 'Webhook signature verification failed') {
    super(message);
  }
}

export class PaymentExpiredException extends BadRequestException {
  constructor() {
    super('Payment has expired');
  }
}

export class DuplicatePaymentException extends BadRequestException {
  constructor(message = 'A duplicate payment attempt was detected') {
    super(message);
  }
}

export class InsufficientMarathonCapacityException extends BadRequestException {
  constructor() {
    super('Marathon has reached maximum capacity');
  }
}

export class AlreadyMarathonMemberException extends BadRequestException {
  constructor() {
    super('You are already a member of this marathon');
  }
}
