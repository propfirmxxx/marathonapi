import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBalanceToProfile1710000000006 implements MigrationInterface {
    name = 'AddBalanceToProfile1710000000006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile" ADD "balance" decimal(10,2) NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "balance"`);
    }
} 