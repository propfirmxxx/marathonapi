import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrizeStrategyToMarathons1710000000011 implements MigrationInterface {
  name = 'AddPrizeStrategyToMarathons1710000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      DO $$
      BEGIN
        -- Ensure enum types exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'prizestrategytype'
        ) THEN
          CREATE TYPE "prizestrategytype" AS ENUM ('winner_take_all', 'percentage_split', 'fixed_amounts');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'marathonstatus'
        ) THEN
          CREATE TYPE "marathonstatus" AS ENUM ('upcoming', 'ongoing', 'finished', 'canceled');
        END IF;

        -- Create marathons table if missing
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'marathons'
        ) THEN
          CREATE TABLE "marathons" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "name" character varying(255) NOT NULL,
            "description" text NOT NULL,
            "entryFee" numeric(10,2) NOT NULL,
            "awardsAmount" numeric(10,2) NOT NULL,
            "prizeStrategyType" "prizestrategytype" NOT NULL DEFAULT 'winner_take_all',
            "prizeStrategyConfig" jsonb,
            "maxPlayers" integer NOT NULL,
            "startDate" TIMESTAMP NOT NULL,
            "endDate" TIMESTAMP NOT NULL,
            "status" "marathonstatus" NOT NULL DEFAULT 'upcoming',
            "isActive" boolean NOT NULL DEFAULT true,
            "rules" jsonb NOT NULL,
            "currentPlayers" integer NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
          );
        END IF;

        -- Create marathon_participants table if missing
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'marathon_participants'
        ) THEN
          CREATE TABLE "marathon_participants" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "marathon_id" uuid NOT NULL,
            "user_id" uuid NOT NULL,
            "metaTraderAccountId" uuid,
            "isActive" boolean NOT NULL DEFAULT false,
            "cancelledAt" TIMESTAMP,
            "refundTransactionId" uuid,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_marathon_participants_marathon" FOREIGN KEY ("marathon_id") REFERENCES "marathons"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_marathon_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS "IDX_marathon_participants_marathon_id"
            ON "marathon_participants" ("marathon_id");
          CREATE INDEX IF NOT EXISTS "IDX_marathon_participants_user_id"
            ON "marathon_participants" ("user_id");
        END IF;
      END
      $$;
    `);

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
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'marathons'
        ) THEN
          UPDATE "marathons"
          SET "prizeStrategyType" = 'winner_take_all'
          WHERE "prizeStrategyType" IS NULL;
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

        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'marathon_participants'
        ) THEN
          DROP TABLE "marathon_participants";
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'marathons'
        ) THEN
          DROP TABLE "marathons";
        END IF;
      END
      $$;
    `);
  }
}

