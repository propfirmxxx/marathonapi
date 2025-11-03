import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePaymentEntityForNowPayments1710000000010 implements MigrationInterface {
  name = 'UpdatePaymentEntityForNowPayments1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_type_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_type_enum AS ENUM ('WALLET_CHARGE', 'MARATHON_JOIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create payment_gateway_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_gateway_enum AS ENUM ('NOWPAYMENTS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add user_id column if not exists (only if payment table exists)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'payment'
        ) THEN
          BEGIN
            ALTER TABLE "payment" ADD COLUMN "userId" uuid;
          EXCEPTION
            WHEN duplicate_column THEN null;
          END;
        END IF;
      END $$;
    `);

    // Populate userId from user relation if exists
    // Only run this if both payment and users tables exist, and if old user_id column exists
    await queryRunner.query(`
      DO $$ 
      DECLARE
        has_user_id_column boolean;
        has_userId_column boolean;
      BEGIN
        -- Check if payment and users tables exist
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'payment'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'users'
        ) THEN
          -- Check if old user_id column exists
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment' AND column_name = 'user_id'
          ) INTO has_user_id_column;
          
          -- Check if new userId column exists
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment' AND column_name = 'userId'
          ) INTO has_userId_column;
          
          -- Only populate if old user_id exists and new userId column exists
          IF has_user_id_column AND has_userId_column THEN
            UPDATE "payment" 
            SET "userId" = (SELECT "id" FROM "users" WHERE "users"."id"::text = "payment"."user_id"::text LIMIT 1)
            WHERE "userId" IS NULL AND EXISTS (SELECT 1 FROM "users");
          END IF;
        END IF;
      END $$;
    `);

    // Add new columns (only if payment table exists)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'payment'
        ) THEN
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "paymentType" payment_type_enum;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "gateway" payment_gateway_enum DEFAULT 'NOWPAYMENTS';
          
          -- NowPayments specific fields
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "nowpaymentsId" character varying;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "payAddress" character varying;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "payAmount" numeric(18,8);
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "payCurrency" character varying(10);
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "network" character varying(50);
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "orderDescription" text;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "invoiceUrl" text;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "ipnCallbackUrl" text;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "webhookData" jsonb;
          
          -- Marathon relation
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "marathon_id" uuid;
          ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "marathonId" uuid;
        END IF;
      END $$;
    `);

    // Add foreign key for marathon (only if both tables exist)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'payment'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'marathons'
        ) THEN
          BEGIN
            ALTER TABLE "payment" 
            ADD CONSTRAINT "FK_payment_marathon" 
            FOREIGN KEY ("marathon_id") 
            REFERENCES "marathons"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
        END IF;
      END $$;
    `);

    // Create indexes (only if payment table exists)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'payment'
        ) THEN
          CREATE INDEX IF NOT EXISTS "IDX_payment_nowpayments_id" ON "payment" ("nowpaymentsId");
          CREATE INDEX IF NOT EXISTS "IDX_payment_user_id" ON "payment" ("userId");
          CREATE INDEX IF NOT EXISTS "IDX_payment_status" ON "payment" ("status");
          CREATE INDEX IF NOT EXISTS "IDX_payment_type" ON "payment" ("paymentType");
          CREATE INDEX IF NOT EXISTS "IDX_payment_user_status_created" ON "payment" ("userId", "status", "createdAt");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_user_status_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_nowpayments_id"`);

    // Drop foreign key
    await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "FK_payment_marathon"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "marathonId"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "marathon_id"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "webhookData"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "ipnCallbackUrl"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "invoiceUrl"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "orderDescription"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "network"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "payCurrency"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "payAmount"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "payAddress"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "nowpaymentsId"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "gateway"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "paymentType"`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN IF EXISTS "userId"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS payment_gateway_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_type_enum`);
  }
}
