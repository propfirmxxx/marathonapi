import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import MetaApi from 'metaapi.cloud-sdk';
import { CreateAccountDto } from './dto/create-account.dto';
import { config } from 'dotenv';
import { MetaTraderAccount, MetaTraderAccountStatus } from './entities/meta-trader-account.entity';
import { TokyoService } from '@/tokyo/tokyo.service';

config();
MetaApi.enableLog4jsLogging();

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private metaApi: MetaApi;

  constructor(
    @InjectRepository(MetaTraderAccount)
    private metaTraderAccountRepository: Repository<MetaTraderAccount>,
    private readonly tokyoService: TokyoService
  ) {
    const token = process.env.META_API_TOKEN;
    if (!token) {
      throw new Error('META_API_TOKEN is not configured');
    }
    this.metaApi = new MetaApi(token);
  }

  async getAccounts() {
    try {
      const accounts = await this.metaApi.metatraderAccountApi.getAccounts();
      return accounts
    } catch (error) {
      this.logger.error('Error getting MetaAPI accounts:', error);
      throw error;
    }
  }

  async createAccount(createAccountDto: CreateAccountDto, userId: string) {
    try {
      const response = await this.tokyoService.createAccount(createAccountDto.login, createAccountDto.masterPassword || createAccountDto.investorPassword, createAccountDto.server);

      if (response.status === 'error') {
        throw new InternalServerErrorException('Something went wrong');
      }

      const metaTraderAccount = this.metaTraderAccountRepository.create({
        name: createAccountDto.name,
        login: createAccountDto.login,
        masterPassword: createAccountDto.masterPassword,
        investorPassword: createAccountDto.investorPassword,
        server: createAccountDto.server,
        userId: userId,
        status: MetaTraderAccountStatus.UNDEPLOYED,
        platform: 'mt5'
      });

      const savedAccount = await this.metaTraderAccountRepository.save(metaTraderAccount);

      return savedAccount;
    } catch (error) {
      this.logger.error('Error creating account:', error);
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

  async validateAccountAccess(uid: string, accountId: string): Promise<boolean> {
    try {
      const account = await this.metaTraderAccountRepository.findOne({
        where: { id: accountId, userId: uid },
      });
      return !!account;
    } catch (error) {
      this.logger.error(`Error validating account access for user ${uid} and account ${accountId}:`, error);
      return false;
    }
  }
} 