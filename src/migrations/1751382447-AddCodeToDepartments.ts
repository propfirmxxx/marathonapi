import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeToDepartments1751382447 implements MigrationInterface {
    name = 'AddCodeToDepartments1751382447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add the column as nullable
        await queryRunner.query(`ALTER TABLE "departments" ADD "code" varchar NULL`);
        // 2. Set a default value for existing rows
        await queryRunner.query(`UPDATE "departments" SET "code" = 'DEFAULT_CODE' WHERE "code" IS NULL`);
        // 3. Alter the column to be NOT NULL and unique
        await queryRunner.query(`ALTER TABLE "departments" ALTER COLUMN "code" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "UQ_departments_code" UNIQUE ("code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "UQ_departments_code"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP COLUMN "code"`);
    }
} 