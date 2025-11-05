import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentType } from '../enums/payment-type.enum';
import { PaymentGateway } from '../enums/payment-gateway.enum';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Payment amount in USD' })
  amount: number;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentType, description: 'Payment type' })
  paymentType: PaymentType;

  @ApiProperty({ enum: PaymentGateway, description: 'Payment gateway' })
  gateway: PaymentGateway;

  @ApiProperty({ description: 'NowPayments payment ID', required: false })
  nowpaymentsId?: string;

  @ApiProperty({ description: 'Cryptocurrency address to pay', required: false })
  payAddress?: string;

  @ApiProperty({ description: 'Amount in cryptocurrency', required: false })
  payAmount?: number;

  @ApiProperty({ description: 'Cryptocurrency code', required: false })
  payCurrency?: string;

  @ApiProperty({ description: 'Network for payment', required: false })
  network?: string;

  @ApiProperty({ description: 'Invoice URL for payment', required: false })
  invoiceUrl?: string;

  @ApiProperty({ description: 'Payment expiration date', required: false })
  expiresAt?: Date;

  @ApiProperty({ description: 'Marathon ID if payment for marathon', required: false })
  marathonId?: string;

  @ApiProperty({ description: 'Whether this is a test payment', required: false, default: false })
  isTest?: boolean;

  @ApiProperty({ description: 'Payment created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Payment updated date' })
  updatedAt: Date;
}
