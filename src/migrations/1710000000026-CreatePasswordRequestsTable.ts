import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordRequestsTable1710000000026 implements MigrationInterface {
  name = 'CreatePasswordRequestsTable1710000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'password_requests'
        ) THEN
          CREATE TABLE "password_requests" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "participantId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            "passwordType" varchar NOT NULL DEFAULT 'master',
            "requestedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_password_requests_participant" FOREIGN KEY ("participantId") 
              REFERENCES "marathon_participants"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_password_requests_user" FOREIGN KEY ("userId") 
              REFERENCES "users"("id") ON DELETE CASCADE
          );

          CREATE INDEX "IDX_password_requests_participantId" 
            ON "password_requests" ("participantId");
          
          CREATE INDEX "IDX_password_requests_userId" 
            ON "password_requests" ("userId");
          
          CREATE INDEX "IDX_password_requests_participant_requested" 
            ON "password_requests" ("participantId", "requestedAt");
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
          SELECT 1 FROM information_schema.tables WHERE table_name = 'password_requests'
        ) THEN
          DROP TABLE "password_requests";
        END IF;
      END
      $$;
    `);
  }
}

