import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToMarathonParticipants1710000000024 implements MigrationInterface {
  name = 'AddStatusToMarathonParticipants1710000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'participantstatus'
        ) THEN
          CREATE TYPE "participantstatus" AS ENUM ('active', 'disqualified', 'completed');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'marathon_participants' AND column_name = 'status'
        ) THEN
          ALTER TABLE "marathon_participants"
          ADD COLUMN "status" "participantstatus" NOT NULL DEFAULT 'active';
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
          WHERE table_name = 'marathon_participants' AND column_name = 'status'
        ) THEN
          ALTER TABLE "marathon_participants" DROP COLUMN "status";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'participantstatus'
        ) THEN
          DROP TYPE "participantstatus";
        END IF;
      END
      $$;
    `);
  }
}

