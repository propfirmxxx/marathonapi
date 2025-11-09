import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVirtualWalletTables1710000000012 implements MigrationInterface {
  name = 'CreateVirtualWalletTables1710000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'virtualwallettransactiontype'
        ) THEN
          CREATE TYPE "virtualwallettransactiontype" AS ENUM ('CREDIT', 'DEBIT', 'REFUND');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'virtual_wallets'
        ) THEN
          CREATE TABLE "virtual_wallets" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL UNIQUE,
            "balance" numeric(12,2) NOT NULL DEFAULT 0,
            "currency" character varying(10) NOT NULL DEFAULT 'USD',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_virtual_wallet_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'virtual_wallet_transactions'
        ) THEN
          CREATE TABLE "virtual_wallet_transactions" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "wallet_id" uuid NOT NULL,
            "type" "virtualwallettransactiontype" NOT NULL,
            "amount" numeric(12,2) NOT NULL,
            "balanceBefore" numeric(12,2) NOT NULL,
            "balanceAfter" numeric(12,2) NOT NULL,
            "referenceType" character varying(100),
            "referenceId" character varying(100),
            "description" character varying(255),
            "metadata" jsonb,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_virtual_wallet_transaction_wallet" FOREIGN KEY ("wallet_id") REFERENCES "virtual_wallets"("id") ON DELETE CASCADE
          );

          CREATE INDEX "IDX_virtual_wallet_transactions_wallet" ON "virtual_wallet_transactions" ("wallet_id");
          CREATE UNIQUE INDEX "UQ_virtual_wallet_transactions_reference"
            ON "virtual_wallet_transactions" ("wallet_id", "type", "referenceType", "referenceId")
            WHERE "referenceId" IS NOT NULL;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'marathon_participants'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathon_participants' AND column_name = 'cancelledAt'
          ) THEN
            ALTER TABLE "marathon_participants" ADD COLUMN "cancelledAt" TIMESTAMP NULL;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathon_participants' AND column_name = 'refundTransactionId'
          ) THEN
            ALTER TABLE "marathon_participants" ADD COLUMN "refundTransactionId" uuid NULL;
          END IF;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'marathon_participants'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathon_participants' AND column_name = 'refundTransactionId'
          ) THEN
            ALTER TABLE "marathon_participants" DROP COLUMN "refundTransactionId";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathon_participants' AND column_name = 'cancelledAt'
          ) THEN
            ALTER TABLE "marathon_participants" DROP COLUMN "cancelledAt";
          END IF;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'virtual_wallet_transactions'
        ) THEN
          DROP TABLE "virtual_wallet_transactions";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'virtual_wallets'
        ) THEN
          DROP TABLE "virtual_wallets";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'virtualwallettransactiontype'
        ) THEN
          DROP TYPE "virtualwallettransactiontype";
        END IF;
      END
      $$;
    `);
  }
}

