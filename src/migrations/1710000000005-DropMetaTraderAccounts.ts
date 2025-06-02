import { MigrationInterface, QueryRunner } from "typeorm";

export class DropMetaTraderAccounts1710000000005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "meta_trader_accounts"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: We're not recreating the table in down migration since we don't have the original schema
        // If you need to recreate the table, you should create a separate migration for that
    }
} 