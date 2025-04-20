import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlValidatorService {
  private allowedDomains: string[];

  constructor() {
    // Initialize allowed domains from environment variables or use defaults
    this.allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [
      'mt5.com',
      'metaapi.cloud',
      'localhost',
    ];
  }

  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return this.allowedDomains.some(domain => 
        parsedUrl.hostname === domain || 
        parsedUrl.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  sanitizeUrl(url: string): string | null {
    if (!this.validateUrl(url)) {
      return null;
    }
    return url;
  }
} 