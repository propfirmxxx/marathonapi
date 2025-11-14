import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MetaTraderAccount } from '../metatrader-accounts/entities/meta-trader-account.entity';

@Injectable()
export class TokyoService {
  private readonly logger = new Logger(TokyoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = process.env.TOKYO_SERVICE_BASE_URL;
    if (!this.baseUrl) {
      this.logger.warn('TOKYO_SERVICE_BASE_URL is not set. Tokyo service integration will not work.');
    } else {
      this.logger.log(`Tokyo Service configured at: ${this.baseUrl}`);
    }
  }

  async createAccount(login: string, password: string, server: string) {
    if (!this.baseUrl) {
      this.logger.error('Tokyo Service URL not configured. Please set TOKYO_SERVICE_BASE_URL environment variable.');
      throw new HttpException(
        'Tokyo Service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      this.logger.debug(`Attempting to create account ${login} at ${this.baseUrl}/account`);
      const response = await axios.post(`${this.baseUrl}/account`, {
        login,
        password,
        server,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Create account request failed for ${login}. URL: ${this.baseUrl}/account, Error: ${error.message}, Code: ${error.code}`,
      );
      throw new HttpException(
        error.response?.data?.message || 'Failed to create account in Tokyo service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deployAccount(login: string) {
    if (!this.baseUrl) {
      this.logger.error('Tokyo Service URL not configured. Please set TOKYO_SERVICE_BASE_URL environment variable.');
      throw new HttpException(
        'Tokyo Service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      this.logger.debug(`Attempting to deploy account ${login} to ${this.baseUrl}/deploy`);
      const response = await axios.post(`${this.baseUrl}/deploy`, {
        login,
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `Deploy request failed for ${login}. URL: ${this.baseUrl}/deploy, Error: ${error.message}, Code: ${error.code}`,
      );
      throw new HttpException(
        error.response?.data?.message || 'Failed to deploy account in Tokyo service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Deploy account with automatic create if config is missing
   * If deploy returns 404 (config not found), creates the account first then deploys again
   */
  async deployAccountWithAutoCreate(account: MetaTraderAccount): Promise<any> {
    if (!this.baseUrl) {
      this.logger.error('Tokyo Service URL not configured. Please set TOKYO_SERVICE_BASE_URL environment variable.');
      throw new HttpException(
        'Tokyo Service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      this.logger.debug(`Attempting to deploy account ${account.login} to ${this.baseUrl}/deploy`);
      const response = await axios.post(`${this.baseUrl}/deploy`, {
        login: account.login,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Deploy request failed for ${account.login}. URL: ${this.baseUrl}/deploy, Error: ${error.message}, Code: ${error.code}`,
      );
      const errorStatus = error?.response?.status;

      // 404 means config file not found - create account then retry deploy
      if (errorStatus === 404 && account.server) {
        const password = account.masterPassword || account.investorPassword;
        
        if (!password) {
          this.logger.warn(`Cannot auto-create account ${account.login}: missing password`);
          throw new HttpException(
            'Account config not found and cannot create: missing password',
            HttpStatus.BAD_REQUEST,
          );
        }

        this.logger.log(`Config missing for ${account.login}, creating account...`);
        
        try {
          await this.createAccount(account.login, password, account.server);
          this.logger.log(`Account ${account.login} created, deploying...`);
          
          const deployResponse = await axios.post(`${this.baseUrl}/deploy`, {
            login: account.login,
          });
          return deployResponse.data;
        } catch (createError: any) {
          this.logger.error(`Failed to create/deploy ${account.login}: ${createError?.response?.data?.message || createError?.message}`);
          throw new HttpException(
            createError?.response?.data?.message || 'Failed to create and deploy account',
            createError?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // Other errors - rethrow as HttpException
      throw new HttpException(
        error?.response?.data?.message || 'Failed to deploy account in Tokyo service',
        errorStatus || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async undeployAccount(login: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/undeploy`, {
        login,
      });

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to undeploy account in Tokyo service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 