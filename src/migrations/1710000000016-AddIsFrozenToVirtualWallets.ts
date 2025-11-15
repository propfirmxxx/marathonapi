import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFrozenToVirtualWallets1710000000016 implements MigrationInterface {
  name = 'AddIsFrozenToVirtualWallets1710000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'virtual_wallets' AND column_name = 'isFrozen'
        ) THEN
          ALTER TABLE "virtual_wallets"
          ADD COLUMN "isFrozen" boolean NOT NULL DEFAULT false;
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
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'virtual_wallets' AND column_name = 'isFrozen'
        ) THEN
          ALTER TABLE "virtual_wallets" DROP COLUMN "isFrozen";
        END IF;
      END
      $$;
    `);
  }
}

