import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Only apply to POST, PUT, DELETE, PATCH requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const origin = req.get('origin');
      const referer = req.get('referer');

      // Check if the request is coming from our allowed origins
      if (!origin && !referer) {
        return res.status(403).json({ message: 'CSRF validation failed' });
      }

      // Validate origin/referer against your allowed domains
      const allowedDomains = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      const isValidOrigin = allowedDomains.some(domain => 
        (origin && origin.startsWith(domain)) || (referer && referer.startsWith(domain))
      );

      if (!isValidOrigin) {
        return res.status(403).json({ message: 'CSRF validation failed' });
      }
    }

    next();
  }
} 