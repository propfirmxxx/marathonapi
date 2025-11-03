import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUsersAndProfiles1710000000003 implements MigrationInterface {
  name = 'DropUsersAndProfiles1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: This migration was created to clean up old data structures.
    // In a fresh database, we should NOT drop the users table as it's needed.
    // This migration should only run if we're migrating from an old database structure.
    
    // Check if this is a fresh database (users table exists with UUID id, not SERIAL)
    const usersExists = await queryRunner.hasTable('users');
    
    if (!usersExists) {
      // Fresh database - skip this migration
      console.log('Skipping DropUsersAndProfiles migration - fresh database detected');
      return;
    }

    // Check if users table has UUID id (new structure) or SERIAL id (old structure)
    const columnInfo = await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);

    // If users table uses UUID (new structure), don't drop it
    if (columnInfo && columnInfo.length > 0 && columnInfo[0].data_type === 'uuid') {
      console.log('Skipping DropUsersAndProfiles migration - users table already uses UUID');
      return;
    }

    // Only drop if we're migrating from old structure (SERIAL integer id)
    // Drop foreign key constraints first
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Drop profile foreign keys
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'profile'
        ) THEN
          ALTER TABLE "profile" DROP CONSTRAINT IF EXISTS "FK_a24972ebd73b106250713dcddd9";
          ALTER TABLE "profile" DROP CONSTRAINT IF EXISTS "FK_profile_user";
        END IF;

        -- Drop wallet constraints if table exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'wallets'
        ) THEN
          ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "FK_92558c08091598f7a4439586cda";
        END IF;

        -- Drop marathon participants constraints if table exists
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'marathon_participants'
        ) THEN
          ALTER TABLE "marathon_participants" DROP CONSTRAINT IF EXISTS "FK_4f6011be6bf7859e0225bdc560d";
        END IF;
      END $$;
    `);

    // Only drop profile table, NOT users table (users is needed and will be updated by migration 0002)
    await queryRunner.query(`DROP TABLE IF EXISTS "profile" CASCADE`);
    
    // DO NOT drop users table - it's needed and will be converted to UUID by migration 0002
    // await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('This migration cannot be reverted as it permanently deletes data.');
  }
} 