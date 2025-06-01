import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialMediaToProfile1710000000004 implements MigrationInterface {
  name = 'AddSocialMediaToProfile1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if profile table exists and create it if it doesn't
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          CREATE TABLE "profile" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "firstName" character varying(100),
            "lastName" character varying(100),
            "nickname" character varying(100),
            "nationality" character varying(100),
            "avatarUrl" character varying,
            "userId" uuid,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id")
          );
        END IF;
      END $$;
    `);

    // Add social media columns to profile table
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "profile"
          ADD COLUMN IF NOT EXISTS "instagramUrl" character varying,
          ADD COLUMN IF NOT EXISTS "twitterUrl" character varying,
          ADD COLUMN IF NOT EXISTS "linkedinUrl" character varying,
          ADD COLUMN IF NOT EXISTS "telegramUrl" character varying;
        END IF;
      END $$;
    `);

    // Drop social_media table and its enum type
    await queryRunner.query(`
      DROP TABLE IF EXISTS "social_media" CASCADE;
      DROP TYPE IF EXISTS "social_media_type_enum";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove social media columns from profile table
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "profile"
          DROP COLUMN IF EXISTS "instagramUrl",
          DROP COLUMN IF EXISTS "twitterUrl",
          DROP COLUMN IF EXISTS "linkedinUrl",
          DROP COLUMN IF EXISTS "telegramUrl";
        END IF;
      END $$;
    `);

    // Recreate social_media_type_enum
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_media_type_enum') THEN
          CREATE TYPE "social_media_type_enum" AS ENUM('instagram', 'telegram', 'twitter', 'linkedin');
        END IF;
      END $$;
    `);

    // Recreate social_media table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "social_media_type_enum" NOT NULL,
        "url" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "profileId" uuid,
        CONSTRAINT "PK_e3b4e9e3e2e0b4a7d8c8b8c8b8c" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "social_media"
          ADD CONSTRAINT IF NOT EXISTS "FK_social_media_profile"
          FOREIGN KEY ("profileId")
          REFERENCES "profile"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }
} 