import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { MetaTraderAccount, MetaTraderAccountStatus } from '../metatrader-accounts/entities/meta-trader-account.entity';

export class MetaTraderAccountSeeder extends BaseSeeder {
  getName(): string {
    return 'MetaTraderAccountSeeder';
  }

  async run(): Promise<void> {
    const hasTable = await this.hasTable('metatrader_accounts');
    if (!hasTable) {
      this.logger.warn('MetaTrader accounts table does not exist. Skipping seeding.');
      return;
    }

    this.logger.log('Seeding MetaTrader account data...');

    // Clear foreign key references first
    const hasParticipants = await this.hasTable('marathon_participants');
    if (hasParticipants) {
      await this.query(`
        UPDATE marathon_participants 
        SET "metaTraderAccountId" = NULL 
        WHERE "metaTraderAccountId" IS NOT NULL
      `);
    }

    // Clear existing data
    await this.query(`DELETE FROM metatrader_accounts`);

    // Insert new data using repository
    const manager = this.getManager();
    const accountRepository = manager.getRepository(MetaTraderAccount);

    // Only keep the two test accounts: 261632685 and 261632689
    const accounts = accountRepository.create([
      {
        name: 'Test Account 1',
        login: '261632689',
        masterPassword: 'cP@hArU,4Dx3)SZ',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 2',
        login: '261632685',
        masterPassword: 'cP@hArU,4Dx3)SZ',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
    ]);

    await accountRepository.save(accounts);

    this.logger.log(`✓ ${accounts.length} MetaTrader account(s) seeded successfully`);
  }

  async clean(): Promise<void> {
    const hasTable = await this.hasTable('metatrader_accounts');
    if (!hasTable) {
      return;
    }

    this.logger.log('Cleaning MetaTrader account data...');

    // Clear foreign key references first
    const hasParticipants = await this.hasTable('marathon_participants');
    if (hasParticipants) {
      await this.query(`
        UPDATE marathon_participants 
        SET "metaTraderAccountId" = NULL 
        WHERE "metaTraderAccountId" IN (
          SELECT id FROM metatrader_accounts 
          WHERE login BETWEEN '10010001' AND '10150001'
             OR login IN ('261632689', '261632685')
        )
      `);
    }

    // Remove all seeded accounts (those with login numbers in the 10000000-10159999 range)
    // Also remove test accounts
    await this.query(`
      DELETE FROM metatrader_accounts 
      WHERE login BETWEEN '10010001' AND '10150001'
         OR login IN ('261632689', '261632685')
    `);

    this.logger.log('✓ MetaTrader account data cleaned');
  }
}

