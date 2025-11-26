import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisqualificationReasonToMarathonParticipants1710000000025 implements MigrationInterface {
  name = 'AddDisqualificationReasonToMarathonParticipants1710000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'marathon_participants' AND column_name = 'disqualificationReason'
        ) THEN
          ALTER TABLE "marathon_participants"
          ADD COLUMN "disqualificationReason" jsonb NULL;
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
          WHERE table_name = 'marathon_participants' AND column_name = 'disqualificationReason'
        ) THEN
          ALTER TABLE "marathon_participants" DROP COLUMN "disqualificationReason";
        END IF;
      END
      $$;
    `);
  }
}

