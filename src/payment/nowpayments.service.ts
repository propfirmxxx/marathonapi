import { Injectable, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { NowPaymentStatus } from './enums/nowpayment-status.enum';

interface CreateInvoiceParams {
  priceAmount: number;
  priceCurrency: string;
  payCurrency?: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl?: string;
  cancelUrl?: string;
  caseId?: string;
}

interface NowPaymentsResponse {
  payment_id?: string;
  payment_status?: string;
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  pay_currency?: string;
  network?: string;
  invoice_id?: string;
  payin_extra_id?: string;
  smart_contract?: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

interface CurrencyInfo {
  name: string;
  code: string;
}

@Injectable()
export class NowPaymentsService {
  private readonly logger = new Logger(NowPaymentsService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly ipnSecret: string;
  private readonly webhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('NOWPAYMENTS_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('NOWPAYMENTS_API_URL', 'https://api.nowpayments.io/v1');
    this.ipnSecret = this.configService.get<string>('NOWPAYMENTS_IPN_SECRET') || '';
    this.webhookUrl = this.configService.get<string>('PAYMENT_WEBHOOK_URL') || '';

    if (!this.apiKey) {
      this.logger.warn('NOWPAYMENTS_API_KEY is not configured');
    }
    if (!this.ipnSecret) {
      this.logger.warn('NOWPAYMENTS_IPN_SECRET is not configured');
    }
  }

  private getHeaders() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(method: string, endpoint: string, data?: any, retries = 3): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Making ${method} request to ${url} (attempt ${attempt}/${retries})`);

        const response = await firstValueFrom(
          this.httpService.request<T>({
            method: method as any,
            url,
            headers: this.getHeaders(),
            data,
          }),
        );

        this.logger.debug(`Response from ${url}: ${JSON.stringify(response.data)}`);
        return response.data;
      } catch (error: any) {
        const errorMessage = error.response?.data || error.message;
        this.logger.error(`Request failed (attempt ${attempt}/${retries}): ${errorMessage}`);

        if (attempt === retries) {
          throw new HttpException(
            error.response?.data?.message || 'NowPayments API request failed',
            error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw new HttpException('Max retries exceeded', HttpStatus.SERVICE_UNAVAILABLE);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getAvailableCurrencies(): Promise<string[]> {
    try {
      const response = await this.makeRequest<any>('GET', 'currencies');
      return response.currencies || [];
    } catch (error) {
      this.logger.error('Failed to get available currencies', error);
      throw error;
    }
  }

  async getMinimumPaymentAmount(currency: string): Promise<number> {
    try {
      const response = await this.makeRequest<any>('GET', `min-amount?currency_from=usd&currency_to=${currency}`);
      return response.min_amount || 0;
    } catch (error) {
      this.logger.error(`Failed to get minimum payment amount for ${currency}`, error);
      throw error;
    }
  }

  async createInvoice(params: CreateInvoiceParams): Promise<NowPaymentsResponse> {
    try {
      const invoiceData = {
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency,
        pay_currency: params.payCurrency || 'usdt',
        order_id: params.orderId,
        order_description: params.orderDescription,
        ipn_callback_url: params.ipnCallbackUrl || this.webhookUrl,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        case_id: params.caseId,
        is_fixed_rate: true, // Use fixed rate to prevent price changes
      };

      this.logger.log(`Creating invoice with params: ${JSON.stringify(invoiceData)}`);

      const response = await this.makeRequest<NowPaymentsResponse>('POST', 'invoice', invoiceData);

      this.logger.log(`Invoice created successfully: ${response.payment_id}`);

      return response;
    } catch (error) {
      this.logger.error('Failed to create invoice', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<NowPaymentsResponse> {
    try {
      const response = await this.makeRequest<NowPaymentsResponse>('GET', `payment/${paymentId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get payment status for ${paymentId}`, error);
      throw error;
    }
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

      this.logger.debug(`Verifying IPN signature. Calculated: ${calculatedSignature}, Received: ${signature}`);

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(calculatedSignature),
        Buffer.from(signature),
      );

      if (!isValid) {
        this.logger.error('IPN signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error during IPN signature verification', error);
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
}
