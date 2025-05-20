import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get language from cookie
    const i18locale = req.cookies?.i18locale;
    let language = 'en'; // default language

    // Supported languages
    const supportedLanguages = ['en', 'fa', 'ar'];
    
    if (i18locale && supportedLanguages.includes(i18locale)) {
      language = i18locale;
    }

    req['language'] = language;
    next();
  }
} 