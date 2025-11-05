export interface CreateInvoiceParams {
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

export interface PaymentResponse {
  // Invoice endpoint response fields
  id?: string;
  token_id?: string;
  invoice_url?: string;
  // Payment endpoint response fields
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

export interface IPaymentProvider {
  createInvoice(params: CreateInvoiceParams): Promise<PaymentResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentResponse>;
  getAvailableCurrencies(): Promise<string[]>;
  getMinimumPaymentAmount(currency: string): Promise<number>;
  verifyIpnSignature(data: any, signature: string): boolean;
  mapNowPaymentStatus(status: string): string;
}

