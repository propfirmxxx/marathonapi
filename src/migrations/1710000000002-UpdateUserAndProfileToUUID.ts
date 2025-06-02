import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserAndProfileToUUID1710000000002 implements MigrationInterface {
  name = 'UpdateUserAndProfileToUUID1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop all foreign key constraints that reference users.id
    await queryRunner.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        ) LOOP
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        END LOOP;
      END $$;
    `);

    // Drop primary key constraint from users
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "PK_users"`);
    
    // Add new UUID columns
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "uuid" uuid DEFAULT uuid_generate_v4()`);

    // Create profile table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying(100),
        "lastName" character varying(100),
        "nickname" character varying(100),
        "nationality" character varying(100),
        "avatarUrl" character varying,
        "userId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id")
      )
    `);

    // Add UUID columns to all related tables
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Add UUID column to profile
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "userUuid" uuid;
        END IF;

        -- Add UUID column to wallets
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallets') THEN
          ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "userUuid" uuid;
        END IF;

        -- Add UUID column to marathon_participants
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marathon_participants') THEN
          ALTER TABLE "marathon_participants" ADD COLUMN IF NOT EXISTS "userUuid" uuid;
        END IF;

        -- Add UUID column to notification_users
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_users') THEN
          ALTER TABLE "notification_users" ADD COLUMN IF NOT EXISTS "userUuid" uuid;
        END IF;

        -- Add UUID column to notification_read_by
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_read_by') THEN
          ALTER TABLE "notification_read_by" ADD COLUMN IF NOT EXISTS "userUuid" uuid;
        END IF;
      END $$;
    `);

    // Update UUIDs in all related tables
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Update profile UUIDs
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          UPDATE "profile" p
          SET "userUuid" = u.uuid
          FROM "users" u
          WHERE p."userId"::integer = u.id;
        END IF;

        -- Update wallet UUIDs
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallets') THEN
          UPDATE "wallets" w
          SET "userUuid" = u.uuid
          FROM "users" u
          WHERE w."user_uid"::integer = u.id;
        END IF;

        -- Update marathon participant UUIDs
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marathon_participants') THEN
          UPDATE "marathon_participants" mp
          SET "userUuid" = u.uuid
          FROM "users" u
          WHERE mp."user_id"::integer = u.id;
        END IF;

        -- Update notification user UUIDs
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_users') THEN
          UPDATE "notification_users" nu
          SET "userUuid" = u.uuid
          FROM "users" u
          WHERE nu."user_id"::integer = u.id;
        END IF;

        -- Update notification read by UUIDs
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_read_by') THEN
          UPDATE "notification_read_by" nrb
          SET "userUuid" = u.uuid
          FROM "users" u
          WHERE nrb."user_id"::integer = u.id;
        END IF;
      END $$;
    `);

    // Drop old columns
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "profile" DROP COLUMN IF EXISTS "userId";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallets') THEN
          ALTER TABLE "wallets" DROP COLUMN IF EXISTS "user_uid";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marathon_participants') THEN
          ALTER TABLE "marathon_participants" DROP COLUMN IF EXISTS "user_id";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_users') THEN
          ALTER TABLE "notification_users" DROP COLUMN IF EXISTS "user_id";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_read_by') THEN
          ALTER TABLE "notification_read_by" DROP COLUMN IF EXISTS "user_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);

    // Rename new columns to original names
    await queryRunner.query(`
      DO $$ 
      BEGIN
        ALTER TABLE "users" RENAME COLUMN "uuid" TO "id";

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "profile" RENAME COLUMN "userUuid" TO "userId";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallets') THEN
          ALTER TABLE "wallets" RENAME COLUMN "userUuid" TO "user_uid";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marathon_participants') THEN
          ALTER TABLE "marathon_participants" RENAME COLUMN "userUuid" TO "user_id";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_users') THEN
          ALTER TABLE "notification_users" RENAME COLUMN "userUuid" TO "user_id";
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_read_by') THEN
          ALTER TABLE "notification_read_by" RENAME COLUMN "userUuid" TO "user_id";
        END IF;
      END $$;
    `);

    // Add primary key constraint back to users
    await queryRunner.query(`ALTER TABLE "users" ADD PRIMARY KEY ("id")`);

    // Re-add foreign key constraints
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Add profile constraint
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile') THEN
          ALTER TABLE "profile"
          ADD CONSTRAINT "FK_9466682df91534dd95e4dbaa616"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;

        -- Add wallet constraint
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallets') THEN
          ALTER TABLE "wallets"
          ADD CONSTRAINT "FK_wallets_user"
          FOREIGN KEY ("user_uid")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;

        -- Add marathon participant constraint
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marathon_participants') THEN
          ALTER TABLE "marathon_participants"
          ADD CONSTRAINT "FK_marathon_participants_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;

        -- Add notification user constraint
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_users') THEN
          ALTER TABLE "notification_users"
          ADD CONSTRAINT "FK_notification_users_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;

        -- Add notification read by constraint
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_read_by') THEN
          ALTER TABLE "notification_read_by"
          ADD CONSTRAINT "FK_notification_read_by_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a one-way migration - going back would lose the UUID information
    throw new Error('This migration cannot be reverted as it would lose UUID information');
  }
} 