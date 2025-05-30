import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get language from cookie
    const i18next = req.cookies?.i18next;
    let language = 'en'; // default language

    // Supported languages
    const supportedLanguages = ['en', 'fa', 'ar'];
    
    if (i18next && supportedLanguages.includes(i18next)) {
      language = i18next;
    }

    req['language'] = language;
    next();
  }
} 