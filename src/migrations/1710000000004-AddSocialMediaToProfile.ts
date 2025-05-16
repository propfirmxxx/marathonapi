import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialMediaToProfile1710000000004 implements MigrationInterface {
  name = 'AddSocialMediaToProfile1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add social media columns to profile table
    await queryRunner.query(`
      ALTER TABLE "profile"
      ADD COLUMN "instagramUrl" character varying,
      ADD COLUMN "twitterUrl" character varying,
      ADD COLUMN "linkedinUrl" character varying,
      ADD COLUMN "telegramUrl" character varying
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
      ALTER TABLE "profile"
      DROP COLUMN "instagramUrl",
      DROP COLUMN "twitterUrl",
      DROP COLUMN "linkedinUrl",
      DROP COLUMN "telegramUrl"
    `);

    // Recreate social_media_type_enum
    await queryRunner.query(`
      CREATE TYPE "social_media_type_enum" AS ENUM('instagram', 'telegram', 'twitter', 'linkedin')
    `);

    // Recreate social_media table
    await queryRunner.query(`
      CREATE TABLE "social_media" (
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
      ALTER TABLE "social_media"
      ADD CONSTRAINT "FK_social_media_profile"
      FOREIGN KEY ("profileId")
      REFERENCES "profile"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }
} 