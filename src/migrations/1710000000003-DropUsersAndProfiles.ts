import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUsersAndProfiles1710000000003 implements MigrationInterface {
  name = 'DropUsersAndProfiles1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Drop profile foreign keys
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'profile' AND constraint_type = 'FOREIGN KEY'
        ) THEN
          ALTER TABLE "profile" DROP CONSTRAINT IF EXISTS "FK_a24972ebd73b106250713dcddd9";
          ALTER TABLE "profile" DROP CONSTRAINT IF EXISTS "FK_profile_user";
        END IF;

        -- Drop any other constraints referencing users table
        ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "FK_92558c08091598f7a4439586cda";
        ALTER TABLE "marathon_participants" DROP CONSTRAINT IF EXISTS "FK_4f6011be6bf7859e0225bdc560d";
      END $$;
    `);

    // Drop the tables
    await queryRunner.query(`DROP TABLE IF EXISTS "profile" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('This migration cannot be reverted as it permanently deletes data.');
  }
} 