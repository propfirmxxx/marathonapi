import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBalanceToProfile1710000000006 implements MigrationInterface {
    name = 'AddBalanceToProfile1710000000006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if profile table exists
        const hasProfile = await queryRunner.hasTable('profile');
        if (!hasProfile) {
            console.log('Profile table does not exist, skipping AddBalanceToProfile migration');
            return;
        }

        // Check if balance column already exists
        const columnExists = await queryRunner.query(`
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'profile' AND column_name = 'balance'
        `);

        if (columnExists && columnExists.length > 0) {
            console.log('Balance column already exists in profile table, skipping migration');
            return;
        }

        // Add balance column only if it doesn't exist
        await queryRunner.query(`
            ALTER TABLE "profile" 
            ADD COLUMN "balance" decimal(10,2) NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasProfile = await queryRunner.hasTable('profile');
        if (!hasProfile) {
            return;
        }

        // Check if balance column exists before dropping
        const columnExists = await queryRunner.query(`
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'profile' AND column_name = 'balance'
        `);

        if (columnExists && columnExists.length > 0) {
            await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "balance"`);
        }
    }
} 