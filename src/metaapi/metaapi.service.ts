import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import MetaApi from 'metaapi.cloud-sdk';
import { CreateAccountDto } from './dto/create-account.dto';
import { config } from 'dotenv';
import { MetaTraderAccount } from './entities/meta-trader-account.entity';

config();
MetaApi.enableLog4jsLogging();

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private metaApi: MetaApi;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MetaTraderAccount)
    private metaTraderAccountRepository: Repository<MetaTraderAccount>,
  ) {
    const token = process.env.META_API_TOKEN;
    if (!token) {
      throw new Error('META_API_TOKEN is not configured');
    }
    this.metaApi = new MetaApi(token);
  }

  async getAccounts() {
    try {
      const accounts = await this.metaApi.metatraderAccountApi.getAccount('1318de1f-ddda-4f50-9395-2d9e99181d65');
      return accounts;
    } catch (error) {
      this.logger.error('Error getting MetaAPI accounts:', error);
      throw error;
    }
  }

  async createAccount(createAccountDto: CreateAccountDto, userId: string) {
    try {
      const account = await this.metaApi.metatraderAccountApi.createAccount({
        name: createAccountDto.name,
        login: createAccountDto.login,
        password: createAccountDto.password,
        server: createAccountDto.server,
        platform: 'mt5',
        magic: 0,
        region: 'new-york',
        baseCurrency: 'USD',
        type: 'cloud-g2',
        keywords: ["Raw Trading Ltd"],
        quoteStreamingIntervalInSeconds: 2.5, // set to 0 to receive quote per tick
        reliability: 'regular' // set this field to 'high' value if you want to increase uptime of your account (recommended for production environments)
      });

      // Save the account to our database
      const metaTraderAccount = this.metaTraderAccountRepository.create({
        accountId: account.id,
        name: createAccountDto.name,
        login: createAccountDto.login,
        password: createAccountDto.password,
        server: createAccountDto.server,
        userId,
        status: 'active',
        platform: 'mt5',
        type: 'cloud',
      });

      const savedAccount = await this.metaTraderAccountRepository.save(metaTraderAccount);

      return savedAccount;
    } catch (error) {
      this.logger.error('Error creating MetaAPI account:', error);
      throw error;
    }
  }

  async getAccountBalance(accountId: string) {
    try {
      const account = await this.metaApi.metatraderAccountApi.getAccount(accountId);
      const connection = account.getRPCConnection();
      await connection.connect();
      await connection.waitSynchronized();

      const accountInformation = await connection.getAccountInformation();
      return {
        balance: accountInformation.balance,
        equity: accountInformation.equity,
        margin: accountInformation.margin,
        freeMargin: accountInformation.freeMargin,
      };
    } catch (error) {
      this.logger.error('Error getting account balance:', error);
      throw error;
    }
  }

  async subscribeToAccountUpdates(accountId: string) {
    try {
      const account = await this.metaApi.metatraderAccountApi.getAccount(accountId);
      const connection = account.getStreamingConnection();
      await connection.connect();
      await connection.waitSynchronized();

      return connection;
    } catch (error) {
      this.logger.error('Error subscribing to account updates:', error);
      throw error;
    }
  }

  async validateAccountAccess(userId: string, accountId: string): Promise<boolean> {
    try {
      const account = await this.metaTraderAccountRepository.findOne({
        where: { accountId, userId },
      });
      return !!account;
    } catch (error) {
      this.logger.error(`Error validating account access for user ${userId} and account ${accountId}:`, error);
      return false;
    }
  }
} 