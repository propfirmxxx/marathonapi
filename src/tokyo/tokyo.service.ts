import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TokyoService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('TOKYO_SERVICE_BASE_URL');
  }

  async createAccount(login: string, password: string, server: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/account`, {
          login,
          password,
          server,
        }),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to create account in Tokyo service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deployAccount(login: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/deploy`, {
          login,
        }),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to deploy account in Tokyo service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async undeployAccount(login: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/undeploy`, {
          login,
        }),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to undeploy account in Tokyo service',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 