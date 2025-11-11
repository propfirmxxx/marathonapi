import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWithdrawalsTable1710000000014 implements MigrationInterface {
  name = 'CreateWithdrawalsTable1710000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update VirtualWalletTransactionType enum to include WITHDRAWAL
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'virtualwallettransactiontype') THEN
          ALTER TYPE "virtualwallettransactiontype" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
        END IF;
      END
      $$;
    `);

    // Create withdrawal_status enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status'
        ) THEN
          CREATE TYPE "withdrawal_status" AS ENUM ('under_review', 'approved', 'paid', 'rejected');
        END IF;
      END
      $$;
    `);

    // Create withdrawals table
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals'
        ) THEN
          CREATE TABLE "withdrawals" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL,
            "wallet_id" uuid NOT NULL,
            "amount" numeric(12,2) NOT NULL,
            "status" "withdrawal_status" NOT NULL DEFAULT 'under_review',
            "transaction_hash" character varying(255),
            "description" text,
            "transaction_number" character varying(50) NOT NULL UNIQUE,
            "virtual_wallet_transaction_id" uuid,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "processed_at" TIMESTAMP,
            CONSTRAINT "FK_withdrawal_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_withdrawal_wallet" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE
          );

          CREATE INDEX "IDX_withdrawals_user_status_created" ON "withdrawals" ("user_id", "status", "created_at");
          CREATE INDEX "IDX_withdrawals_status" ON "withdrawals" ("status");
          CREATE INDEX "IDX_withdrawals_transaction_number" ON "withdrawals" ("transaction_number");
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop withdrawals table
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals'
        ) THEN
          DROP TABLE "withdrawals";
        END IF;
      END
      $$;
    `);

    // Drop withdrawal_status enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status'
        ) THEN
          DROP TYPE "withdrawal_status";
        END IF;
      END
      $$;
    `);

    // Note: We don't remove WITHDRAWAL from virtualwallettransactiontype enum
    // because removing enum values in PostgreSQL requires recreating the enum,
    // which could break existing data
  }
}

