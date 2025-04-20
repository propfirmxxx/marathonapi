import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import MetaApi from 'metaapi.cloud-sdk';
import { CreateAccountDto } from './dto/create-account.dto';
import { config } from 'dotenv';
import { MetaTraderAccount } from './entities/meta-trader-account.entity';

config();

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private metaApi: any;

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

  async createAccount(createAccountDto: CreateAccountDto, userId: string) {
    try {
      const account = await this.metaApi.metatraderAccountApi.createAccount({
        name: createAccountDto.name,
        type: 'cloud',
        login: createAccountDto.login,
        password: createAccountDto.password,
        server: createAccountDto.server,
        platform: 'mt5',
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

      await this.metaTraderAccountRepository.save(metaTraderAccount);

      return account;
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