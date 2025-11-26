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

    const manager = this.getManager();
    const accountRepository = manager.getRepository(MetaTraderAccount);

    // Test accounts and additional accounts for testing join/leave
    // Using upsert to avoid deleting existing accounts that might be referenced
    const testAccountsData = [
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
      // Additional accounts for testing join/leave process
      {
        name: 'Test Account 3',
        login: '10010001',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 4',
        login: '10010002',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 5',
        login: '10010003',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 6',
        login: '10010004',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 7',
        login: '10010005',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 8',
        login: '10010006',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 9',
        login: '10010007',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Test Account 10',
        login: '10010008',
        masterPassword: 'TestPassword123',
        server: 'Exness-MT5Trial16',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
    ];

    // Check if accounts already exist and upsert them
    for (const accountData of testAccountsData) {
      const existing = await accountRepository.findOne({
        where: { login: accountData.login }
      });

      if (existing) {
        // Update existing account - ensure no assignments
        existing.name = accountData.name;
        existing.masterPassword = accountData.masterPassword;
        existing.server = accountData.server;
        existing.platform = accountData.platform;
        existing.status = accountData.status;
        // Clear any assignments
        existing.marathonParticipantId = null;
        existing.userId = null;
        await accountRepository.save(existing);
      } else {
        // Create new account - no assignments
        const newAccount = accountRepository.create({
          ...accountData,
          marathonParticipantId: null,
          userId: null,
        });
        await accountRepository.save(newAccount);
      }
    }

    this.logger.log(`✓ ${testAccountsData.length} MetaTrader account(s) seeded successfully`);
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

