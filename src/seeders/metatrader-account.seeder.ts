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

    // Clear existing data
    await this.query(`DELETE FROM metatrader_accounts`);

    // Insert new data using repository
    const manager = this.getManager();
    const accountRepository = manager.getRepository(MetaTraderAccount);

    // Generate 35 sample accounts with diverse data
    const accounts = accountRepository.create([
      {
        name: 'Demo Account #1',
        login: '10010001',
        masterPassword: 'Demo123!',
        server: 'MetaQuotes-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Demo Account #2',
        login: '10010002',
        masterPassword: 'Demo123!',
        server: 'MetaQuotes-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Trading Account Alpha',
        login: '10020001',
        investorPassword: 'Investor123!',
        server: 'FXDD-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Trading Account Beta',
        login: '10020002',
        masterPassword: 'Master123!',
        server: 'FXDD-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Champion Account #1',
        login: '10030001',
        masterPassword: 'Champ123!',
        server: 'IC Markets-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Champion Account #2',
        login: '10030002',
        masterPassword: 'Champ123!',
        server: 'IC Markets-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Champion Account #3',
        login: '10030003',
        investorPassword: 'Investor123!',
        server: 'IC Markets-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Professional Trader #1',
        login: '10040001',
        masterPassword: 'Pro123!',
        server: 'XM Global-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Professional Trader #2',
        login: '10040002',
        masterPassword: 'Pro123!',
        server: 'XM Global-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Elite Trading Account',
        login: '10050001',
        investorPassword: 'Elite123!',
        server: 'Exness-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Starter Account #1',
        login: '10060001',
        masterPassword: 'Start123!',
        server: 'OANDA-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Starter Account #2',
        login: '10060002',
        masterPassword: 'Start123!',
        server: 'OANDA-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Starter Account #3',
        login: '10060003',
        investorPassword: 'Start123!',
        server: 'OANDA-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Advanced Account #1',
        login: '10070001',
        masterPassword: 'Adv123!',
        server: 'Pepperstone-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Advanced Account #2',
        login: '10070002',
        masterPassword: 'Adv123!',
        server: 'Pepperstone-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Master Account #1',
        login: '10080001',
        investorPassword: 'Master123!',
        server: 'Forex.com-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Master Account #2',
        login: '10080002',
        masterPassword: 'Master123!',
        server: 'Forex.com-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Master Account #3',
        login: '10080003',
        masterPassword: 'Master123!',
        server: 'Forex.com-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Premium Account #1',
        login: '10090001',
        masterPassword: 'Prem123!',
        server: 'CMC Markets-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Premium Account #2',
        login: '10090002',
        investorPassword: 'Prem123!',
        server: 'CMC Markets-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Trading Pro #1',
        login: '10100001',
        masterPassword: 'Pro123!',
        server: 'AvaTrade-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Trading Pro #2',
        login: '10100002',
        masterPassword: 'Pro123!',
        server: 'AvaTrade-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Trading Pro #3',
        login: '10100003',
        investorPassword: 'Pro123!',
        server: 'AvaTrade-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Challenger Account #1',
        login: '10110001',
        masterPassword: 'Chall123!',
        server: 'FXTM-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Challenger Account #2',
        login: '10110002',
        masterPassword: 'Chall123!',
        server: 'FXTM-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Challenger Account #3',
        login: '10110003',
        investorPassword: 'Chall123!',
        server: 'FXTM-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Veteran Account #1',
        login: '10120001',
        masterPassword: 'Vet123!',
        server: 'OctaFX-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Veteran Account #2',
        login: '10120002',
        masterPassword: 'Vet123!',
        server: 'OctaFX-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Veteran Account #3',
        login: '10120003',
        investorPassword: 'Vet123!',
        server: 'OctaFX-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Expert Account #1',
        login: '10130001',
        masterPassword: 'Expert123!',
        server: 'Alpari-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Expert Account #2',
        login: '10130002',
        masterPassword: 'Expert123!',
        server: 'Alpari-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Expert Account #3',
        login: '10130003',
        investorPassword: 'Expert123!',
        server: 'Alpari-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Competition Account #1',
        login: '10140001',
        masterPassword: 'Comp123!',
        server: 'FXCM-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Competition Account #2',
        login: '10140002',
        masterPassword: 'Comp123!',
        server: 'FXCM-Demo',
        platform: 'mt5',
        status: MetaTraderAccountStatus.UNDEPLOYED,
      },
      {
        name: 'Competition Account #3',
        login: '10140003',
        investorPassword: 'Comp123!',
        server: 'FXCM-Demo',
        platform: 'mt4',
        status: MetaTraderAccountStatus.DEPLOYED,
      },
      {
        name: 'Elite Competition Account',
        login: '10150001',
        masterPassword: 'EliteComp123!',
        server: 'IG Markets-Demo',
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

    // Remove all seeded accounts (those with login numbers in the 10000000-10159999 range)
    await this.query(`
      DELETE FROM metatrader_accounts 
      WHERE login BETWEEN '10010001' AND '10150001'
    `);

    this.logger.log('✓ MetaTrader account data cleaned');
  }
}

