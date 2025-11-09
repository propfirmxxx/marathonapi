import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToMarathons1710000000013 implements MigrationInterface {
  name = 'AddStatusToMarathons1710000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'marathonstatus'
        ) THEN
          CREATE TYPE "marathonstatus" AS ENUM ('upcoming', 'ongoing', 'finished', 'canceled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'marathons' AND column_name = 'status'
        ) THEN
          ALTER TABLE "marathons"
          ADD COLUMN "status" "marathonstatus" NOT NULL DEFAULT 'upcoming';
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
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'marathons' AND column_name = 'status'
        ) THEN
          ALTER TABLE "marathons" DROP COLUMN "status";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'marathonstatus'
        ) THEN
          DROP TYPE "marathonstatus";
        END IF;
      END
      $$;
    `);
  }
}

