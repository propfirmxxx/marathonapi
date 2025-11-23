import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBanReasonAndBannedAtToUsers1710000000023 implements MigrationInterface {
  name = 'AddBanReasonAndBannedAtToUsers1710000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ban_reason_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ban_reason_enum AS ENUM (
          'violation_of_terms',
          'spam',
          'fraud',
          'abusive_behavior',
          'suspicious_activity',
          'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add banReason column
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'banReason'
        ) THEN
          ALTER TABLE "users"
          ADD COLUMN "banReason" ban_reason_enum;
        END IF;
      END
      $$;
    `);

    // Add bannedAt column
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'bannedAt'
        ) THEN
          ALTER TABLE "users"
          ADD COLUMN "bannedAt" TIMESTAMP;
        END IF;
      END
      $$;
    `);

    // Add bannedUntil column
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'bannedUntil'
        ) THEN
          ALTER TABLE "users"
          ADD COLUMN "bannedUntil" TIMESTAMP;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'banReason'
        ) THEN
          ALTER TABLE "users" DROP COLUMN "banReason";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'bannedAt'
        ) THEN
          ALTER TABLE "users" DROP COLUMN "bannedAt";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'bannedUntil'
        ) THEN
          ALTER TABLE "users" DROP COLUMN "bannedUntil";
        END IF;
      END
      $$;
    `);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS ban_reason_enum;`);
  }
}

