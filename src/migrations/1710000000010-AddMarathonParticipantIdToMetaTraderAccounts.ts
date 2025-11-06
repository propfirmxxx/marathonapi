import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarathonParticipantIdToMetaTraderAccounts1710000000010 implements MigrationInterface {
  name = 'AddMarathonParticipantIdToMetaTraderAccounts1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'metatrader_accounts'
        ) THEN
          BEGIN
            -- Check if column already exists
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'metatrader_accounts' AND column_name = 'marathonParticipantId'
            ) THEN
              -- Add the marathonParticipantId column as UUID to match marathon_participants.id
              ALTER TABLE "metatrader_accounts" 
              ADD COLUMN "marathonParticipantId" uuid;
              
              -- Create index on the column
              CREATE INDEX IF NOT EXISTS "IDX_metatrader_accounts_marathonParticipantId" 
              ON "metatrader_accounts" ("marathonParticipantId");
            END IF;
          EXCEPTION
            WHEN duplicate_column THEN null;
          END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'metatrader_accounts' AND column_name = 'marathonParticipantId'
        ) THEN
          -- Drop index if exists
          DROP INDEX IF EXISTS "IDX_metatrader_accounts_marathonParticipantId";
          
          -- Drop the column
          ALTER TABLE "metatrader_accounts" DROP COLUMN "marathonParticipantId";
        END IF;
      END $$;
    `);
  }
}
