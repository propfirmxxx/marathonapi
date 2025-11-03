import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NowPaymentsWebhookDto {
  @ApiProperty({ description: 'Payment ID from NowPayments' })
  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @ApiProperty({ description: 'Payment status' })
  @IsString()
  @IsNotEmpty()
  payment_status: string;

  @ApiProperty({ description: 'Address to send payment to' })
  @IsString()
  @IsNotEmpty()
  pay_address: string;

  @ApiProperty({ description: 'Amount to pay in cryptocurrency' })
  @IsNumber()
  pay_amount: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  @IsNotEmpty()
  pay_currency: string;

  @ApiProperty({ description: 'Price in USD' })
  @IsNumber()
  price_amount: number;

  @ApiProperty({ description: 'Price currency' })
  @IsString()
  @IsNotEmpty()
  price_currency: string;

  @ApiProperty({ description: 'Order ID from your system' })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ description: 'Order description', required: false })
  @IsString()
  @IsOptional()
  order_description?: string;

  @ApiProperty({ description: 'Invoice ID', required: false })
  @IsString()
  @IsOptional()
  invoice_id?: string;

  @ApiProperty({ description: 'Output address', required: false })
  @IsString()
  @IsOptional()
  output_address?: string;

  @ApiProperty({ description: 'Network for payment', required: false })
  @IsString()
  @IsOptional()
  network?: string;

  @ApiProperty({ description: 'Transaction hash', required: false })
  @IsString()
  @IsOptional()
  txhash?: string;

  @ApiProperty({ description: 'IPN callback URL', required: false })
  @IsString()
  @IsOptional()
  ipn_callback_url?: string;

  @ApiProperty({ description: 'Created at timestamp', required: false })
  @IsString()
  @IsOptional()
  created_at?: string;

  @ApiProperty({ description: 'Updated at timestamp', required: false })
  @IsString()
  @IsOptional()
  updated_at?: string;

  @ApiProperty({ description: 'Purchase ID', required: false })
  @IsString()
  @IsOptional()
  purchase_id?: string;

  @ApiProperty({ description: 'Smart contract address', required: false })
  @IsString()
  @IsOptional()
  smart_contract?: string;

  @ApiProperty({ description: 'Network extra', required: false })
  @IsString()
  @IsOptional()
  network_extra_id?: string;

  @ApiProperty({ description: 'Time limit for payment', required: false })
  @IsNumber()
  @IsOptional()
  time_limit?: number;

  @ApiProperty({ description: 'Expiration rate', required: false })
  @IsNumber()
  @IsOptional()
  expiration_estimate_date?: number;

  @ApiProperty({ description: 'Payer email', required: false })
  @IsString()
  @IsOptional()
  buyer_email?: string;

  @ApiProperty({ description: 'Refund hash', required: false })
  @IsString()
  @IsOptional()
  refund_hash?: string;

  @ApiProperty({ description: 'IS test mode payment', required: false })
  @IsNumber()
  @IsOptional()
  is_test?: number;

  @ApiProperty({ description: 'Is fixed rate', required: false })
  @IsNumber()
  @IsOptional()
  is_fixed_rate?: number;

  @ApiProperty({ description: 'Is fee paid by user', required: false })
  @IsNumber()
  @IsOptional()
  is_fee_paid_by_user?: number;

  @ApiProperty({ description: 'Outcome amount', required: false })
  @IsNumber()
  @IsOptional()
  outcome_amount?: number;

  @ApiProperty({ description: 'Outcome currency', required: false })
  @IsString()
  @IsOptional()
  outcome_currency?: string;
}
