import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsBannedToUsers1710000000015 implements MigrationInterface {
  name = 'AddIsBannedToUsers1710000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'isBanned'
        ) THEN
          ALTER TABLE "users"
          ADD COLUMN "isBanned" boolean NOT NULL DEFAULT false;
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
          WHERE table_name = 'users' AND column_name = 'isBanned'
        ) THEN
          ALTER TABLE "users" DROP COLUMN "isBanned";
        END IF;
      END
      $$;
    `);
  }
}

