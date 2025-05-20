import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class I18nService {
  private translations: Map<string, any> = new Map();
  private defaultLanguage = 'en';

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations() {
    const translationsPath = path.join(__dirname, 'translations');
    const files = fs.readdirSync(translationsPath);

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const language = file.replace('.json', '');
        const content = JSON.parse(
          fs.readFileSync(path.join(translationsPath, file), 'utf-8'),
        );
        this.translations.set(language, content);
      }
    });
  }

  translate(key: string, language: string = this.defaultLanguage, params?: Record<string, any>): string {
    const translations = this.translations.get(language) || this.translations.get(this.defaultLanguage);
    let message = this.getNestedTranslation(translations, key);

    if (!message) {
      return key;
    }

    if (params) {
      Object.keys(params).forEach((param) => {
        message = message.replace(`{${param}}`, params[param]);
      });
    }

    return message;
  }

  private getNestedTranslation(obj: any, key: string): string {
    const keys = key.split('.');
    let result = obj;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return null;
      }
    }

    return typeof result === 'string' ? result : null;
  }

  getAvailableLanguages(): string[] {
    return Array.from(this.translations.keys());
  }
} 