import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SessionService } from '../../settings/session.service';
import { SessionStatus } from '../../settings/entities/session.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('User account is banned');
    }

    // Extract token from request header and validate session
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const session = await this.sessionService.getSessionByToken(token);

      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      if (session.status === SessionStatus.REVOKED) {
        throw new UnauthorizedException('Session has been revoked');
      }

      if (session.status === SessionStatus.EXPIRED) {
        throw new UnauthorizedException('Session has expired');
      }

      // Check if token is expired
      if (session.expiresAt < new Date()) {
        // Mark session as expired
        await this.sessionService.updateSessionStatus(session.id, SessionStatus.EXPIRED);
        throw new UnauthorizedException('Session has expired');
      }
    }

    return user;
  }
} 