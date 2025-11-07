import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrizeStrategyToMarathons1710000000011 implements MigrationInterface {
  name = 'AddPrizeStrategyToMarathons1710000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'marathons'
        ) THEN
          -- Ensure enum type exists
          IF NOT EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'prizestrategytype'
          ) THEN
            CREATE TYPE "prizestrategytype" AS ENUM ('winner_take_all', 'percentage_split', 'fixed_amounts');
          END IF;

          -- Add prizeStrategyType column if missing
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathons' AND column_name = 'prizeStrategyType'
          ) THEN
            ALTER TABLE "marathons"
            ADD COLUMN "prizeStrategyType" "prizestrategytype" NOT NULL DEFAULT 'winner_take_all';
          END IF;

          -- Add prizeStrategyConfig column if missing
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathons' AND column_name = 'prizeStrategyConfig'
          ) THEN
            ALTER TABLE "marathons"
            ADD COLUMN "prizeStrategyConfig" jsonb;
          END IF;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      UPDATE "marathons"
      SET "prizeStrategyType" = 'winner_take_all'
      WHERE "prizeStrategyType" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'marathons'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathons' AND column_name = 'prizeStrategyConfig'
          ) THEN
            ALTER TABLE "marathons" DROP COLUMN "prizeStrategyConfig";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'marathons' AND column_name = 'prizeStrategyType'
          ) THEN
            ALTER TABLE "marathons" DROP COLUMN "prizeStrategyType";
          END IF;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'prizestrategytype'
        ) THEN
          DROP TYPE "prizestrategytype";
        END IF;
      END
      $$;
    `);
  }
}

