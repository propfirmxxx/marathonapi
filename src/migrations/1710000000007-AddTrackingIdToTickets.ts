import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrackingIdToTickets1710000000007 implements MigrationInterface {
    name = 'AddTrackingIdToTickets1710000000007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create the sequence starting at 1000
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "tickets_tracking_id_seq" START 1000`);
        // 2. Add the column as nullable for now, only if it does not exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tickets' AND column_name='tracking_id'
                ) THEN
                    ALTER TABLE "tickets" ADD "tracking_id" integer UNIQUE;
                END IF;
            END;
            $$;
        `);
        // 3. Populate tracking_id for existing rows where it is null
        await queryRunner.query(`
            UPDATE "tickets" SET "tracking_id" = nextval('tickets_tracking_id_seq')
            WHERE "tracking_id" IS NULL
        `);
        // 4. Alter the column to be NOT NULL and set default from sequence
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "tracking_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "tracking_id" SET DEFAULT nextval('tickets_tracking_id_seq')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "tracking_id"`);
        await queryRunner.query(`DROP SEQUENCE IF EXISTS "tickets_tracking_id_seq"`);
    }
} 