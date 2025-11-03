# Payment Flow Documentation

## Overview

This document describes the complete payment flow for the Marathon API, including wallet charging and marathon join payments using NowPayments integration.

## Architecture

### Components

1. **PaymentController**: Handles HTTP requests and responses
2. **PaymentService**: Business logic for payment processing
3. **NowPaymentsService**: Integration with NowPayments API
4. **ProfileService**: Balance management
5. **MarathonService**: Marathon participant management

### Database Entities

- **Payment**: Stores all payment records with full webhook data
- **Profile**: User profiles with balance information
- **Marathon**: Marathon details with entry fees
- **MarathonParticipant**: Marathon membership records

## Payment Types

### 1. Wallet Charge Payment

Used to add balance to a user's account.

**Flow:**
```
User → POST /payment/wallet/charge
     → PaymentService.createWalletChargePayment()
     → NowPaymentsService.createInvoice()
     → Save Payment entity
     → Return payment details (address, amount, etc.)
     → User pays via NowPayments
     → NowPayments webhook received
     → Verify IPN signature
     → Process wallet charge
     → Update user balance
```

**Endpoint:** `POST /api/payment/wallet/charge`

**Request Body:**
```json
{
  "amount": 100.50,
  "currency": "usdt"
}
```

**Response:**
```json
{
  "paymentId": "uuid",
  "paymentUrl": "invoice_url",
  "payAddress": "crypto_address",
  "payAmount": 99.95,
  "payCurrency": "usdt",
  "network": "TRC20",
  "expiresAt": "2024-01-01T12:30:00Z"
}
```

### 2. Marathon Join Payment

Used to join a marathon by paying the entry fee.

**Flow:**
```
User → POST /payment/marathon/:marathonId
     → PaymentService.createMarathonPayment()
     → Check marathon capacity
     → Check if already member
     → NowPaymentsService.createInvoice()
     → Save Payment entity
     → Return payment details
     → User pays via NowPayments
     → NowPayments webhook received
     → Verify IPN signature
     → Process marathon join (transaction)
     → Create MarathonParticipant
     → Update marathon currentPlayers count
```

**Endpoint:** `POST /api/payment/marathon/:marathonId`

**Response:**
```json
{
  "paymentId": "uuid",
  "paymentUrl": "invoice_url",
  "payAddress": "crypto_address",
  "payAmount": 49.99,
  "payCurrency": "usdt",
  "network": "TRC20",
  "expiresAt": "2024-01-01T12:30:00Z"
}
```

## Webhook Processing

### Security

All webhooks from NowPayments are verified using IPN signature verification to ensure authenticity.

**Verification Process:**
1. Sort all webhook parameters by key
2. Create query string: `key1=value1&key2=value2`
3. Calculate HMAC-SHA512 with IPN secret
4. Compare with received signature (constant-time)

**Endpoint:** `POST /api/payment/webhook`

**Headers:**
```
x-nowpayments-sig: signature
```

**Webhook Statuses:**
- `waiting` → `PENDING`
- `confirming` → `PENDING`
- `confirmed` → `PENDING`
- `sending` → `PENDING`
- `partially_paid` → `PENDING`
- `finished` → `COMPLETED` ✅
- `failed` → `FAILED`
- `refunded` → `CANCELLED`
- `expired` → `CANCELLED`

### Idempotency

Each webhook is processed only once:
- Check if payment already has `COMPLETED` status
- Skip processing if already processed
- Prevents duplicate balance additions or marathon joins

## Error Handling

### Payment Expiration

- Payments expire after 30 minutes
- User must complete payment within expiration window
- Expired payments are automatically marked as `CANCELLED`

### Duplicate Prevention

**Wallet Charges:**
- Only one pending wallet charge allowed per user
- Previous pending charges are cancelled if expired

**Marathon Joins:**
- Only one pending payment per marathon per user
- Checks for existing membership before creating payment

### Capacity Management

**Marathon Capacity:**
- Validates `currentPlayers < maxPlayers` before payment
- Re-validates capacity during webhook processing
- Uses database transactions to prevent race conditions

### Failed Payments

When webhook processing fails:
- Payment status updated to `FAILED`
- Error logged for investigation
- User balance/participant status unchanged
- Requires manual intervention

## Database Transactions

### Marathon Join Processing

All database operations are wrapped in a transaction:
1. Start transaction
2. Re-check marathon capacity
3. Check existing membership
4. Create MarathonParticipant
5. Increment marathon.currentPlayers
6. Commit or rollback

This ensures data consistency even with concurrent webhook processing.

## Payment States

```
PENDING → User initiated payment, waiting for crypto payment
COMPLETED → Payment confirmed and processed
FAILED → Payment failed during processing
CANCELLED → Payment expired or cancelled
```

## API Reference

### Get Payment Details

**Endpoint:** `GET /api/payment/:id`

**Response:** Full payment details including webhook data

### Get User Payments

**Endpoint:** `GET /api/payment/my-payments/all`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (PENDING, COMPLETED, FAILED, CANCELLED)
- `paymentType`: Filter by type (WALLET_CHARGE, MARATHON_JOIN)

**Response:**
```json
{
  "payments": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

## Security Considerations

### 1. IPN Signature Verification

- All webhooks must include valid `x-nowpayments-sig` header
- Signature calculated using HMAC-SHA512
- Constant-time comparison to prevent timing attacks
- Invalid signatures rejected with `403 Forbidden`

### 2. Input Validation

- All DTOs validated using `class-validator`
- Amount limits enforced (min: $1, max: $10,000)
- Currency validation
- UUID format validation

### 3. Authentication

- All endpoints except webhook require JWT authentication
- User can only access their own payments
- Webhook endpoint is public (verified by signature)

### 4. Rate Limiting

- Webhook endpoint has rate limiting
- Prevents abuse and DDoS attacks
- Configured in AppModule

### 5. SQL Injection Prevention

- All queries use TypeORM parameterized queries
- No raw SQL injection vectors
- Database indexes for performance

### 6. Logging

- All operations logged for audit trail
- Webhook signatures logged for debugging
- Failed payments logged with full context
- Sensitive data excluded from logs

## Testing

### Unit Tests

Test coverage for:
- Payment service methods
- NowPayments service integration
- Webhook verification logic
- Balance calculations

### Integration Tests

Test scenarios:
- Complete wallet charge flow
- Complete marathon join flow
- Webhook processing with various statuses
- Error handling and rollbacks
- Concurrent payment processing

### Mock NowPayments

Use mocked responses for:
- Invoice creation
- Payment status checks
- Webhook signatures

## Monitoring & Alerts

### Key Metrics

- Payment success rate
- Average payment processing time
- Failed webhook processing rate
- Expired payment count

### Alerts

Configure alerts for:
- High failed payment rate
- Webhook signature verification failures
- Database transaction rollbacks
- NowPayments API errors

## Deployment Checklist

- [ ] Configure NowPayments API keys
- [ ] Set IPN secret securely
- [ ] Update webhook URL to production domain
- [ ] Run database migration
- [ ] Enable rate limiting
- [ ] Configure monitoring
- [ ] Test webhook endpoint
- [ ] Verify cron job for expired payments (if implemented)
- [ ] Set up alerts

## Environment Variables

```env
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1
NOWPAYMENTS_SANDBOX_MODE=false
PAYMENT_WEBHOOK_URL=https://yourdomain.com/api/payment/webhook
```

## Support

For issues or questions:
- Check logs in application
- Verify NowPayments dashboard
- Review webhook delivery status
- Contact NowPayments support if needed

## Future Enhancements

- Automatic retry for failed webhooks
- Payment cancellation API
- Refund processing
- Multiple currency support expansion
- Payment history export
- Admin payment management dashboard
