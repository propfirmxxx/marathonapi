import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeparateProfileAndUser1710000000001 implements MigrationInterface {
  name = 'SeparateProfileAndUser1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure we have the profile table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying(100),
        "lastName" character varying(100),
        "nickname" character varying(100),
        "nationality" character varying(100),
        "avatarUrl" character varying,
        "userId" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "REL_9466682df91534dd95e4dbaa61" UNIQUE ("userId"),
        CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id")
      )
    `);

    // Migrate data from users to profile
    await queryRunner.query(`
      INSERT INTO "profile" ("firstName", "lastName", "avatarUrl", "userId", "createdAt", "updatedAt")
      SELECT "firstName", "lastName", "avatar", "id", "createdAt", "updatedAt"
      FROM "users"
      WHERE NOT EXISTS (
        SELECT 1 FROM "profile" WHERE "profile"."userId" = "users"."id"
      )
    `);

    // Remove profile-related columns from users table
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "firstName",
      DROP COLUMN "lastName",
      DROP COLUMN "avatar"
    `);

    // Add foreign key constraint if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_9466682df91534dd95e4dbaa616'
        ) THEN
          ALTER TABLE "profile"
          ADD CONSTRAINT "FK_9466682df91534dd95e4dbaa616"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the columns to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "firstName" character varying(100),
      ADD COLUMN "lastName" character varying(100),
      ADD COLUMN "avatar" character varying
    `);

    // Migrate data back from profile to users
    await queryRunner.query(`
      UPDATE "users" u
      SET 
        "firstName" = p."firstName",
        "lastName" = p."lastName",
        "avatar" = p."avatarUrl"
      FROM "profile" p
      WHERE p."userId" = u."id"
    `);

    // Drop the profile table
    await queryRunner.query(`DROP TABLE "profile"`);
  }
} 