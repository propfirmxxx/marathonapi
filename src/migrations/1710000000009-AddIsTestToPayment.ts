import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsTestToPayment1710000000009 implements MigrationInterface {
  name = 'AddIsTestToPayment1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'payment'
        ) THEN
          BEGIN
            ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "isTest" boolean NOT NULL DEFAULT false;
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
          WHERE table_name = 'payment' AND column_name = 'isTest'
        ) THEN
          ALTER TABLE "payment" DROP COLUMN "isTest";
        END IF;
      END $$;
    `);
  }
}

