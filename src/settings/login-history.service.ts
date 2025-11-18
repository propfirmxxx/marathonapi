import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LoginHistory,
  LoginStatus,
  LoginMethod,
} from './entities/login-history.entity';
import { LoginHistoryResponseDto } from './dto/login-history-response.dto';
import { GetLoginHistoryQueryDto } from './dto/get-login-history-query.dto';
import { parseUserAgent } from './utils/device-parser.util';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class LoginHistoryService {
  constructor(
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepository: Repository<LoginHistory>,
  ) {}

  /**
   * Record a login attempt
   */
  async recordLogin(
    userId: string,
    status: LoginStatus,
    method: LoginMethod,
    ipAddress: string,
    userAgent: string,
    failureReason?: string,
  ): Promise<LoginHistory> {
    const deviceInfo = parseUserAgent(userAgent);

    const loginHistory = this.loginHistoryRepository.create({
      userId,
      status,
      method,
      ipAddress,
      userAgent,
      deviceInfo,
      failureReason,
    });

    return await this.loginHistoryRepository.save(loginHistory);
  }

  /**
   * Get login history for a user
   */
  async getUserLoginHistory(
    userId: string,
    query: GetLoginHistoryQueryDto,
  ): Promise<PaginatedResponseDto<LoginHistoryResponseDto>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.method) {
      where.method = query.method;
    }

    const [history, total] = await this.loginHistoryRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = history.map((entry) => this.mapToResponseDto(entry));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(history: LoginHistory): LoginHistoryResponseDto {
    return {
      id: history.id,
      status: history.status,
      method: history.method,
      ipAddress: history.ipAddress,
      userAgent: history.userAgent,
      deviceInfo: history.deviceInfo || {},
      failureReason: history.failureReason,
      location: history.location,
      createdAt: history.createdAt,
    };
  }
}

