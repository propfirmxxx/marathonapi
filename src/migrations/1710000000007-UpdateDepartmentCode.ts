import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDepartmentCode1710000000007 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE departments
            ADD COLUMN code VARCHAR(6) NOT NULL DEFAULT ''
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE departments
            DROP COLUMN code
        `);
    }
}