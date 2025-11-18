import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../session.service';

@Injectable()
export class SessionActivityMiddleware implements NestMiddleware {
  constructor(private readonly sessionService: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // Update session activity asynchronously (don't block the request)
      this.sessionService.updateLastActivity(token).catch((err) => {
        // Silently fail - don't interrupt the request flow
        console.error('Failed to update session activity:', err);
      });
    }

    next();
  }
}

