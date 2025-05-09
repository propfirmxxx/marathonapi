import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Only apply to POST, PUT, DELETE, PATCH requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const origin = req.get('origin');
      const referer = req.get('referer');

      // Basic check to ensure request has origin or referer
      if (!origin && !referer) {
        return res.status(403).json({ message: 'CSRF validation failed: Missing origin or referer' });
      }
    }

    next();
  }
} 