import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRoleEnum1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE user_role_enum AS ENUM ('admin', 'user');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TYPE IF EXISTS user_role_enum;`);
    }
} 