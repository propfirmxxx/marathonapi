import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let language = 'en'; // default language

    // Supported languages
    const supportedLanguages = ['en', 'fa', 'ar', 'tr'];
    
    // 1. Check Accept-Language header first (highest priority)
    const acceptLanguageHeader = req.headers['accept-language'];
    if (acceptLanguageHeader) {
      // Parse Accept-Language header (e.g., "fa-IR,fa;q=0.9,en;q=0.8" or just "fa")
      const languages = acceptLanguageHeader
        .split(',')
        .map(lang => {
          const parts = lang.trim().split(';');
          const code = parts[0].split('-')[0].toLowerCase(); // Extract base language code (fa from fa-IR)
          const quality = parts[1] ? parseFloat(parts[1].replace('q=', '')) : 1.0;
          return { code, quality };
        })
        .sort((a, b) => b.quality - a.quality); // Sort by quality

      // Find the first supported language
      const preferredLanguage = languages.find(lang => 
        supportedLanguages.includes(lang.code)
      );

      if (preferredLanguage) {
        language = preferredLanguage.code;
      }
    }
    
    // 2. Fall back to cookie if no header found
    if (language === 'en') {
      const i18next = req.cookies?.i18next;
      if (i18next && supportedLanguages.includes(i18next)) {
        language = i18next;
      }
    }

    req['language'] = language;
    next();
  }
} 