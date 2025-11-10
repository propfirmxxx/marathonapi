# Withdrawals Module - Summary

## ✅ Module Created Successfully

A complete withdrawal request module has been added to your MarathonAPI project, following the same structure and patterns as your existing modules (like Marathon).

## 📁 Files Created

### 1. **Enums**
- `src/withdrawals/enums/withdrawal-status.enum.ts`
  - Statuses: `UNDER_REVIEW`, `APPROVED`, `PAID`, `REJECTED`
  - Matches your Persian requirements: در حال بررسی، تایید شده، واریز شده، رد شده

### 2. **Entity**
- `src/withdrawals/entities/withdrawal.entity.ts`
  - Fields:
    - `id` (UUID)
    - `userId` (UUID, foreign key to users)
    - `walletId` (UUID, foreign key to wallets)
    - `amount` (decimal)
    - `status` (enum)
    - `transactionHash` (nullable string)
    - `description` (nullable text)
    - `transactionNumber` (unique string, auto-generated)
    - `virtualWalletTransactionId` (UUID, links to virtual wallet transaction)
    - `createdAt`, `updatedAt`, `processedAt` (timestamps)
  - Indexes for optimized queries

### 3. **DTOs**
- `src/withdrawals/dto/create-withdrawal.dto.ts`
  - Fields: `amount`, `walletId`
  - Validation: amount must be >= 0.01, walletId must be valid UUID
  
- `src/withdrawals/dto/get-withdrawals.dto.ts`
  - Pagination: `page`, `limit`
  - Filters: `status`, `search`
  
- `src/withdrawals/dto/withdrawal-response.dto.ts`
  - Complete response DTO with wallet information

### 4. **Service**
- `src/withdrawals/withdrawals.service.ts`
  - **`create(userId, dto)`**: Creates withdrawal request
    - ✅ Verifies wallet belongs to user
    - ✅ Checks virtual wallet balance
    - ✅ Debits from virtual wallet
    - ✅ Auto-generates transaction number (format: `WD-YYYYMMDD-XXXX`)
    - ✅ Uses database transactions for data consistency
  
  - **`findAllByUser(userId, page, limit, status?, search?)`**: Lists user's withdrawals
    - ✅ Pagination support
    - ✅ Filter by status
    - ✅ Search by transaction number or description
    - ✅ Sorted by creation date (newest first)
  
  - **`findOne(userId, id)`**: Gets single withdrawal details

### 5. **Controller**
- `src/withdrawals/withdrawals.controller.ts`
  - **POST `/withdrawals`**: Create withdrawal request
  - **GET `/withdrawals`**: List user's withdrawals (with filters)
  - **GET `/withdrawals/:id`**: Get single withdrawal details
  - ✅ JWT authentication required
  - ✅ Full Swagger documentation included

### 6. **Module**
- `src/withdrawals/withdrawals.module.ts`
  - Imports: VirtualWalletModule, UsersModule, AuthModule
  - Exports: WithdrawalsService (for potential admin features)

### 7. **Migration**
- `src/migrations/1710000000014-CreateWithdrawalsTable.ts`
  - Creates `withdrawals` table
  - Creates `withdrawal_status` enum
  - Updates `VirtualWalletTransactionType` enum to include `WITHDRAWAL`
  - Adds necessary indexes

### 8. **Updated Files**
- `src/app.module.ts`: Added WithdrawalsModule import
- `src/users/entities/virtual-wallet-transaction.entity.ts`: Added `WITHDRAWAL` to transaction types enum

## 🔧 How It Works

### Creating a Withdrawal Request

1. User calls `POST /api/withdrawals` with:
```json
{
  "amount": 100.50,
  "walletId": "user-wallet-uuid"
}
```

2. System validates:
   - ✅ Wallet belongs to the user
   - ✅ User has sufficient balance in virtual wallet

3. If valid:
   - Debits amount from virtual wallet
   - Creates withdrawal record with status `UNDER_REVIEW`
   - Generates unique transaction number (e.g., `WD-20251110-0001`)
   - Returns withdrawal details

### Listing Withdrawals

User calls `GET /api/withdrawals` with optional query parameters:
- `?page=1&limit=10` - Pagination
- `&status=under_review` - Filter by status
- `&search=WD-2025` - Search in transaction number or description

### Transaction Flow

```
User Balance (Virtual Wallet)
    ↓ (debit on request)
Withdrawal Request Created (UNDER_REVIEW)
    ↓ (admin approval)
Status → APPROVED
    ↓ (payment processing)
Status → PAID (transaction_hash added)
```

Or if rejected:
```
Status → REJECTED (description explains reason)
Note: Balance was already debited, so admin may need to credit back manually
```

## 📚 API Endpoints

All endpoints are documented in Swagger at `/api/docs`:

### 1. Create Withdrawal Request
- **POST** `/api/withdrawals`
- **Auth**: Required (JWT)
- **Body**:
```json
{
  "amount": 100.50,
  "walletId": "uuid"
}
```
- **Response**: `WithdrawalResponseDto`

### 2. List Withdrawals
- **GET** `/api/withdrawals`
- **Auth**: Required (JWT)
- **Query Params**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `status` (enum: under_review | approved | paid | rejected)
  - `search` (string)
- **Response**: Paginated list of withdrawals

### 3. Get Withdrawal Details
- **GET** `/api/withdrawals/:id`
- **Auth**: Required (JWT)
- **Response**: Single withdrawal details

## 🗄️ Database Migration

To apply the migration, run:
```bash
npm run migration:run
# or
yarn migration:run
```

This will create the `withdrawals` table and update the necessary enums.

## ✨ Features Implemented

✅ User can create withdrawal requests
✅ Virtual wallet balance is checked before creating request
✅ Only user's own wallets can be selected
✅ Automatic transaction number generation
✅ List withdrawals with pagination
✅ Filter withdrawals by status
✅ Search in transaction numbers and descriptions
✅ Full Swagger documentation
✅ Database transactions for data consistency
✅ Proper error handling
✅ TypeORM entities with indexes for performance

## 🎯 Status Flow

1. **UNDER_REVIEW** (در حال بررسی): Initial status when created
2. **APPROVED** (تایید شده | در صف پرداخت): Admin approved, ready for payment
3. **PAID** (واریز شده): Payment completed, transaction_hash recorded
4. **REJECTED** (رد شده): Request rejected, description contains reason

## 🔐 Security

- ✅ JWT authentication required
- ✅ Users can only see their own withdrawals
- ✅ Users can only select from their own wallets
- ✅ Balance validation before processing
- ✅ Database transactions prevent race conditions

## 📝 Next Steps (Optional)

For complete functionality, you may want to add:

1. **Admin endpoints** to manage withdrawal requests:
   - Approve/reject requests
   - Update status to PAID with transaction hash
   - View all pending withdrawals

2. **Refund functionality** if a withdrawal is rejected after balance was debited

3. **Email notifications** when status changes

4. **Webhook handlers** if using automated payment gateways

## 🧪 Testing

You can test the endpoints using:
- Swagger UI at `/api/docs`
- Postman/Insomnia
- Your frontend application

## 🌍 Persian Status Mapping

| Database Value | Persian Translation |
|---------------|---------------------|
| `under_review` | در حال بررسی |
| `approved` | تایید شده \| در صف پرداخت |
| `paid` | واریز شده |
| `rejected` | رد شده |

---

**Module fully integrated and ready to use!** 🚀

