import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfileAndSocialMedia1710000000000 implements MigrationInterface {
  name = 'CreateProfileAndSocialMedia1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."social_media_type_enum" AS ENUM('instagram', 'telegram', 'youtube', 'twitter', 'linkedin')
    `);

    await queryRunner.query(`
      CREATE TABLE "profile" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying,
        "lastName" character varying,
        "nickname" character varying,
        "nationality" character varying,
        "avatarUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid,
        CONSTRAINT "REL_9466682df91534dd95e4dbaa61" UNIQUE ("userId"),
        CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "social_media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "public"."social_media_type_enum" NOT NULL,
        "url" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "profileId" uuid,
        CONSTRAINT "PK_e3b4e9e3e2e0b4a7d8c8b8c8b8c" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "profile"
      ADD CONSTRAINT "FK_9466682df91534dd95e4dbaa616"
      FOREIGN KEY ("userId")
      REFERENCES "user"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "social_media"
      ADD CONSTRAINT "FK_social_media_profile"
      FOREIGN KEY ("profileId")
      REFERENCES "profile"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "social_media" DROP CONSTRAINT "FK_social_media_profile"`);
    await queryRunner.query(`ALTER TABLE "profile" DROP CONSTRAINT "FK_9466682df91534dd95e4dbaa616"`);
    await queryRunner.query(`DROP TABLE "social_media"`);
    await queryRunner.query(`DROP TABLE "profile"`);
    await queryRunner.query(`DROP TYPE "public"."social_media_type_enum"`);
  }
} 