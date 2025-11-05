import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { IPaymentProvider, CreateInvoiceParams, PaymentResponse } from './interfaces/payment-provider.interface';
import { NowPaymentStatus } from './enums/nowpayment-status.enum';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';

interface MockPayment {
  payment_id: string;
  status: string;
  order_id: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  pay_address: string;
  invoice_url: string;
  created_at: Date;
}

@Injectable()
export class MockPaymentService implements IPaymentProvider {
  private readonly logger = new Logger(MockPaymentService.name);
  private readonly webhookUrl: string;
  private readonly ipnSecret: string;
  private readonly mockPayments: Map<string, MockPayment> = new Map();
  private readonly paymentStatusFlow: string[] = [
    NowPaymentStatus.WAITING,
    NowPaymentStatus.CONFIRMING,
    NowPaymentStatus.CONFIRMED,
    NowPaymentStatus.SENDING,
    NowPaymentStatus.FINISHED,
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {
    this.webhookUrl = this.configService.get<string>('PAYMENT_WEBHOOK_URL') || '';
    this.ipnSecret = this.configService.get<string>('NOWPAYMENTS_IPN_SECRET') || 'mock-secret-key';
    this.logger.warn('⚠️  MOCK PAYMENT SERVICE ACTIVE - Simulating NowPayments behavior without real transactions');
  }

  async createInvoice(params: CreateInvoiceParams): Promise<PaymentResponse> {
    this.logger.log(`[MOCK] Creating invoice for order: ${params.orderId}`);
    
    // Generate mock payment ID
    const paymentId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tokenId = Math.random().toString(36).substr(2, 9);
    
    // Generate mock crypto address
    const mockAddress = '0x' + crypto.randomBytes(20).toString('hex');
    
    // Calculate pay amount (simulate exchange rate)
    const exchangeRate = 0.998; // Simulate small fee
    const payAmount = params.priceAmount * exchangeRate;

    // Create mock payment
    const mockPayment: MockPayment = {
      payment_id: paymentId,
      status: NowPaymentStatus.WAITING,
      order_id: params.orderId,
      pay_amount: payAmount,
      pay_currency: params.payCurrency || 'usdttrc20',
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      pay_address: mockAddress,
      invoice_url: `https://nowpayments.io/test-payment/?iid=${paymentId}`,
      created_at: new Date(),
    };

    this.mockPayments.set(paymentId, mockPayment);

    this.logger.log(`[MOCK] Invoice created: ${paymentId}`);

    // Simulate payment flow with delays (like real NowPayments)
    this.simulatePaymentFlow(paymentId, params.ipnCallbackUrl);

    // Return response
    return {
      id: paymentId,
      token_id: tokenId,
      invoice_url: mockPayment.invoice_url,
      payment_id: paymentId,
      pay_address: mockAddress,
      pay_amount: payAmount,
      pay_currency: params.payCurrency || 'usdttrc20',
      network: 'TRC20',
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    const payment = this.mockPayments.get(paymentId);
    
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    return {
      payment_id: payment.payment_id,
      payment_status: payment.status,
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
      pay_currency: payment.pay_currency,
      price_amount: payment.price_amount,
      price_currency: payment.price_currency,
      order_id: payment.order_id,
      invoice_id: payment.invoice_url,
    };
  }

  async getAvailableCurrencies(): Promise<string[]> {
    // Return common cryptocurrencies
    return [
      'usdttrc20',
      'usdtbsc',
      'usdc',
      'busd',
      'dai',
      'eth',
      'btc',
      'usdcbsc',
      'usdcmatic',
      'usdcsol',
    ];
  }

  async getMinimumPaymentAmount(currency: string): Promise<number> {
    // Return minimum amount (1 USD equivalent)
    return 1;
  }

  verifyIpnSignature(data: any, signature: string): boolean {
    try {
      // Create sorted string from data
      const sortedKeys = Object.keys(data).sort();
      const sortedString = sortedKeys
        .map((key) => `${key}=${data[key]}`)
        .join('&');

      // Calculate HMAC SHA512
      const hmac = crypto.createHmac('sha512', this.ipnSecret);
      hmac.update(sortedString);
      const calculatedSignature = hmac.digest('hex');

      this.logger.debug(`[MOCK] Verifying IPN signature. Calculated: ${calculatedSignature}, Received: ${signature}`);

      // Compare signatures (constant-time comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(calculatedSignature),
        Buffer.from(signature),
      );

      if (!isValid) {
        this.logger.error('[MOCK] IPN signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('[MOCK] Error during IPN signature verification', error);
      return false;
    }
  }

  mapNowPaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      [NowPaymentStatus.WAITING]: 'PENDING',
      [NowPaymentStatus.CONFIRMING]: 'PENDING',
      [NowPaymentStatus.CONFIRMED]: 'PENDING',
      [NowPaymentStatus.SENDING]: 'PENDING',
      [NowPaymentStatus.PARTIALLY_PAID]: 'PENDING',
      [NowPaymentStatus.FINISHED]: 'COMPLETED',
      [NowPaymentStatus.FAILED]: 'FAILED',
      [NowPaymentStatus.REFUNDED]: 'CANCELLED',
      [NowPaymentStatus.EXPIRED]: 'CANCELLED',
    };

    return statusMap[status] || 'PENDING';
  }

  /**
   * Simulate payment flow with status transitions and webhook calls
   */
  private async simulatePaymentFlow(paymentId: string, webhookUrl: string): Promise<void> {
    const payment = this.mockPayments.get(paymentId);
    if (!payment) return;

    // Simulate payment flow with delays
    // WAITING -> CONFIRMING -> CONFIRMED -> SENDING -> FINISHED
    let statusIndex = 0;

    const updateStatus = async (status: string) => {
      if (payment) {
        payment.status = status;
        this.mockPayments.set(paymentId, payment);
        this.logger.log(`[MOCK] Payment ${paymentId} status updated to: ${status}`);
        
        // Update database payment status
        try {
          const dbPayment = await this.paymentRepository.findOne({
            where: { nowpaymentsId: paymentId },
          });
          
          if (dbPayment) {
            // Map NowPayments status to our PaymentStatus
            const statusMap: Record<string, PaymentStatus> = {
              [NowPaymentStatus.WAITING]: PaymentStatus.PENDING,
              [NowPaymentStatus.CONFIRMING]: PaymentStatus.PENDING,
              [NowPaymentStatus.CONFIRMED]: PaymentStatus.PENDING,
              [NowPaymentStatus.SENDING]: PaymentStatus.PENDING,
              [NowPaymentStatus.PARTIALLY_PAID]: PaymentStatus.PENDING,
              [NowPaymentStatus.FINISHED]: PaymentStatus.COMPLETED,
              [NowPaymentStatus.FAILED]: PaymentStatus.FAILED,
              [NowPaymentStatus.REFUNDED]: PaymentStatus.CANCELLED,
              [NowPaymentStatus.EXPIRED]: PaymentStatus.CANCELLED,
            };
            
            dbPayment.status = statusMap[status] || PaymentStatus.PENDING;
            dbPayment.webhookData = {
              ...dbPayment.webhookData,
              payment_status: status,
              updated_at: new Date().toISOString(),
            };
            await this.paymentRepository.save(dbPayment);
            this.logger.log(`[MOCK] Database payment ${dbPayment.id} status updated to: ${dbPayment.status}`);
          }
        } catch (error) {
          this.logger.error(`[MOCK] Failed to update database payment status: ${error.message}`);
        }
      }
    };

    // Send webhook for each status change
    const sendWebhook = async (status: string) => {
      if (!webhookUrl) {
        this.logger.warn(`[MOCK] No webhook URL configured, skipping webhook`);
        return;
      }

      try {
        const webhookData = {
          payment_id: payment.payment_id,
          payment_status: status,
          order_id: payment.order_id,
          pay_amount: payment.pay_amount,
          pay_currency: payment.pay_currency,
          price_amount: payment.price_amount,
          price_currency: payment.price_currency,
        };

        // Generate signature
        const sortedKeys = Object.keys(webhookData).sort();
        const sortedString = sortedKeys
          .map((key) => `${key}=${webhookData[key]}`)
          .join('&');
        const hmac = crypto.createHmac('sha512', this.ipnSecret);
        hmac.update(sortedString);
        const signature = hmac.digest('hex');

        // Convert webhook URL to local endpoint
        let finalUrl = webhookUrl;
        if (webhookUrl.startsWith('https://')) {
          // Replace https with http and extract path
          const url = new URL(webhookUrl);
          finalUrl = `http://localhost:3000${url.pathname}`;
        } else if (webhookUrl.startsWith('http://')) {
          // Replace host with localhost
          const url = new URL(webhookUrl);
          finalUrl = `http://localhost:3000${url.pathname}`;
        } else {
          // Assume it's a path
          finalUrl = `http://localhost:3000${webhookUrl.startsWith('/') ? webhookUrl : '/' + webhookUrl}`;
        }

        this.logger.log(`[MOCK] Sending webhook to: ${finalUrl}`);

        await this.httpService.axiosRef.post(finalUrl, webhookData, {
          headers: {
            'x-nowpayments-sig': signature,
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 second timeout
        }).catch((error) => {
          // Log error but don't fail - webhook might be called later
          this.logger.warn(`[MOCK] Webhook call failed (will retry): ${error.message}`);
        });

        this.logger.log(`[MOCK] Webhook sent for payment ${paymentId} with status: ${status}`);
      } catch (error) {
        this.logger.error(`[MOCK] Failed to send webhook: ${error.message}`);
      }
    };

    // Simulate flow: WAITING (2s) -> CONFIRMING (3s) -> CONFIRMED (2s) -> SENDING (3s) -> FINISHED
    const delays = [2000, 3000, 2000, 3000]; // delays in milliseconds

    for (let i = 0; i < this.paymentStatusFlow.length - 1; i++) {
      await new Promise(resolve => setTimeout(resolve, delays[i] || 2000));
      
      statusIndex++;
      const nextStatus = this.paymentStatusFlow[statusIndex];
      await updateStatus(nextStatus);
      await sendWebhook(nextStatus);
    }
  }
}

