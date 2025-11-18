import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSettingsTables1710000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE date_format_enum AS ENUM ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE time_format_enum AS ENUM ('12h', '24h');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE profile_visibility_enum AS ENUM ('public', 'private');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE session_status_enum AS ENUM ('active', 'expired', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE login_status_enum AS ENUM ('success', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE login_method_enum AS ENUM ('email', 'google');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create user_settings table
    await queryRunner.createTable(
      new Table({
        name: 'user_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'dateFormat',
            type: 'enum',
            enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'],
            enumName: 'date_format_enum',
            default: "'DD/MM/YYYY'",
          },
          {
            name: 'timeFormat',
            type: 'enum',
            enum: ['12h', '24h'],
            enumName: 'time_format_enum',
            default: "'24h'",
          },
          {
            name: 'timezone',
            type: 'varchar',
            default: "'UTC'",
          },
          {
            name: 'emailNotificationsEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'inAppNotificationsEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'profileVisibility',
            type: 'enum',
            enum: ['public', 'private'],
            enumName: 'profile_visibility_enum',
            default: "'public'",
          },
          {
            name: 'showSocialMediaLinks',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showTradingInfo',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create sessions table
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'deviceInfo',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'revoked'],
            enumName: 'session_status_enum',
            default: "'active'",
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create login_history table
    await queryRunner.createTable(
      new Table({
        name: 'login_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failed'],
            enumName: 'login_status_enum',
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['email', 'google'],
            enumName: 'login_method_enum',
            default: "'email'",
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'deviceInfo',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_settings',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sessions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'login_history',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_sessions_token_status',
        columnNames: ['token', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'login_history',
      new TableIndex({
        name: 'IDX_login_history_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'login_history',
      new TableIndex({
        name: 'IDX_login_history_ipAddress_createdAt',
        columnNames: ['ipAddress', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('login_history', 'IDX_login_history_ipAddress_createdAt');
    await queryRunner.dropIndex('login_history', 'IDX_login_history_userId_createdAt');
    await queryRunner.dropIndex('sessions', 'IDX_sessions_token_status');
    await queryRunner.dropIndex('sessions', 'IDX_sessions_userId_status');

    // Drop foreign keys
    await queryRunner.dropForeignKey('login_history', 'FK_login_history_userId');
    await queryRunner.dropForeignKey('sessions', 'FK_sessions_userId');
    await queryRunner.dropForeignKey('user_settings', 'FK_user_settings_userId');

    // Drop tables
    await queryRunner.dropTable('login_history');
    await queryRunner.dropTable('sessions');
    await queryRunner.dropTable('user_settings');

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS login_method_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS login_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS session_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS profile_visibility_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS time_format_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS date_format_enum`);
  }
}

