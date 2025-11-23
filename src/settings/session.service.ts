import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Session, SessionStatus } from './entities/session.entity';
import { SessionResponseDto } from './dto/session-response.dto';
import { GetSessionsQueryDto } from './dto/get-sessions-query.dto';
import { parseUserAgent } from './utils/device-parser.util';
import { JwtService } from '@nestjs/jwt';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { LocationService } from './location.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly jwtService: JwtService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    expiresAt: Date,
    sessionId?: string,
  ): Promise<Session> {
    const deviceInfo = parseUserAgent(userAgent);

    // Get location data from IP (async, but we don't await to avoid blocking)
    const location = await this.locationService.getLocationFromIp(ipAddress);

    const session = this.sessionRepository.create({
      ...(sessionId ? { id: sessionId } : {}),
      userId,
      token,
      ipAddress,
      userAgent,
      deviceInfo,
      location,
      expiresAt,
      status: SessionStatus.ACTIVE,
      lastActivityAt: new Date(),
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Update session token
   */
  async updateSessionToken(sessionId: string, token: string, expiresAt: Date): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      { 
        token,
        expiresAt,
        lastActivityAt: new Date()
      },
    );
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(
    userId: string,
    query: GetSessionsQueryDto,
    currentToken?: string,
  ): Promise<PaginatedResponseDto<SessionResponseDto>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    // By default, only return active sessions
    where.status = SessionStatus.ACTIVE;

    const [sessions, total] = await this.sessionRepository.findAndCount({
      where,
      order: { lastActivityAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = sessions.map((session) => ({
      ...this.mapToResponseDto(session),
      isCurrent: currentToken ? session.token === currentToken : false,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Revoke a session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === SessionStatus.REVOKED) {
      throw new ForbiddenException('Session already revoked');
    }

    session.status = SessionStatus.REVOKED;
    await this.sessionRepository.save(session);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(userId: string, currentToken: string): Promise<void> {
    await this.sessionRepository.update(
      {
        userId,
        token: Not(currentToken),
        status: SessionStatus.ACTIVE,
      },
      {
        status: SessionStatus.REVOKED,
      },
    );
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      {
        userId,
        status: SessionStatus.ACTIVE,
      },
      {
        status: SessionStatus.REVOKED,
      },
    );
  }

  /**
   * Update session last activity
   */
  async updateLastActivity(token: string): Promise<void> {
    await this.sessionRepository.update(
      { token, status: SessionStatus.ACTIVE },
      { lastActivityAt: new Date() },
    );
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      { status },
    );
  }

  /**
   * Validate session token and return session if valid
   */
  async validateSessionToken(token: string): Promise<Session | null> {
    const session = await this.getSessionByToken(token);

    if (!session) {
      return null;
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      // Mark as expired
      await this.updateSessionStatus(session.id, SessionStatus.EXPIRED);
      return null;
    }

    return session;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository.update(
      {
        expiresAt: LessThan(new Date()),
        status: SessionStatus.ACTIVE,
      },
      {
        status: SessionStatus.EXPIRED,
      },
    );
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { token, status: SessionStatus.ACTIVE },
    });
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(session: Session): SessionResponseDto {
    return {
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo || {},
      location: session.location || undefined,
      status: session.status,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    };
  }
}

