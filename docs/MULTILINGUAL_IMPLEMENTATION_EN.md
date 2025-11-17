# Multi-Language System Implementation Guide

## Overview

This system enables serving content in multiple languages via the API. Users can specify their preferred language through the `Accept-Language` header, and receive data in the requested language.

## Supported Languages

- `en` - English (default)
- `fa` - Persian/Farsi
- `ar` - Arabic
- `tr` - Turkish

## Architecture

### 1. Middleware

File: `src/i18n/i18n.middleware.ts`

The middleware processes the `Accept-Language` header and selects the appropriate language:

- Priority: `Accept-Language` header (with quality value support) → cookie → default (English)
- Supports standard formats like `fa-IR,fa;q=0.9,en;q=0.8`
- Automatically applied to all routes via `app.module.ts`

### 2. Language Decorator

File: `src/i18n/decorators/language.decorator.ts`

A custom decorator to extract the language from the request:

```typescript
import { Language } from '../i18n/decorators/language.decorator';

@Get()
async findAll(@Language() language: string) {
  // language will be 'en', 'fa', 'ar', or 'tr'
}
```

### 3. Translation Files

Location: `src/i18n/translations/`

JSON files for each supported language containing UI messages and validation texts.

## Implementation Guide for New Modules

### Step 1: Design the Entity

Use JSON columns to store translations:

```typescript
import { Entity, Column } from 'typeorm';

export interface TranslationFields {
  en?: string;
  fa?: string;
  ar?: string;
  tr?: string;
}

@Entity('your_table')
export class YourEntity {
  @Column('jsonb')
  title: TranslationFields;
  
  @Column('jsonb')
  description: TranslationFields;
}
```

### Step 2: Create Migration

```typescript
export class AddMultilingualSupport implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'your_table'
        ) THEN
          ALTER TABLE your_table 
          ADD COLUMN IF NOT EXISTS title_temp jsonb;

          UPDATE your_table 
          SET title_temp = jsonb_build_object('en', title)
          WHERE title_temp IS NULL;

          ALTER TABLE your_table 
          DROP COLUMN IF EXISTS title;

          ALTER TABLE your_table 
          RENAME COLUMN title_temp TO title;

          ALTER TABLE your_table 
          ALTER COLUMN title SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}
```

### Step 3: Update DTOs

```typescript
import { Type } from 'class-transformer';
import { ValidateNested, IsObject, IsOptional, IsString } from 'class-validator';

export class TranslationFieldsDto {
  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()
  @IsString()
  fa?: string;

  @IsOptional()
  @IsString()
  ar?: string;

  @IsOptional()
  @IsString()
  tr?: string;
}

export class CreateYourDto {
  @ApiProperty({
    example: {
      en: 'Title in English',
      fa: 'عنوان به فارسی',
      ar: 'العنوان بالعربية',
      tr: 'Türkçe başlık'
    }
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TranslationFieldsDto)
  title: TranslationFieldsDto;
}
```

### Step 4: Update Service

Implement localization logic:

```typescript
export interface LocalizedYourEntity {
  id: string;
  title: string;
  description: string;
}

@Injectable()
export class YourService {
  private readonly supportedLanguages = ['en', 'fa', 'ar', 'tr'];
  private readonly defaultLanguage = 'en';

  private getTranslatedField(
    translations: TranslationFields, 
    language: string
  ): string {
    if (translations[language]) return translations[language];
    if (translations[this.defaultLanguage]) return translations[this.defaultLanguage];
    
    for (const lang of this.supportedLanguages) {
      if (translations[lang]) return translations[lang];
    }
    
    return '';
  }

  private localizeEntity(entity: YourEntity, language: string): LocalizedYourEntity {
    return {
      id: entity.id,
      title: this.getTranslatedField(entity.title, language),
      description: this.getTranslatedField(entity.description, language),
    };
  }

  async findAll(language: string = 'en') {
    const entities = await this.repository.find();
    return entities.map(e => this.localizeEntity(e, language));
  }
}
```

### Step 5: Update Controller

```typescript
import { Language } from '../i18n/decorators/language.decorator';
import { ApiHeader } from '@nestjs/swagger';

@Controller('your-resource')
export class YourController {
  @Get()
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Language code (en, fa, ar, tr)',
    required: false,
    example: 'fa'
  })
  async findAll(@Language() language: string) {
    return this.service.findAll(language);
  }
}
```

## Searching in JSON Fields (PostgreSQL)

To search across all languages:

```typescript
const qb = this.repository.createQueryBuilder('entity');

if (searchQuery) {
  const pattern = `%${searchQuery.toLowerCase()}%`;
  qb.where(
    `(
      LOWER(CAST(entity.title->>'en' AS TEXT)) LIKE :pattern OR
      LOWER(CAST(entity.title->>'fa' AS TEXT)) LIKE :pattern OR
      LOWER(CAST(entity.title->>'ar' AS TEXT)) LIKE :pattern OR
      LOWER(CAST(entity.title->>'tr' AS TEXT)) LIKE :pattern
    )`,
    { pattern }
  );
}
```

## API Usage Examples

### Request with Accept-Language Header

```bash
# Get data in Persian
curl -H "Accept-Language: fa" http://localhost:3000/faq

# Get data in Arabic
curl -H "Accept-Language: ar" http://localhost:3000/faq

# Get data in Turkish
curl -H "Accept-Language: tr" http://localhost:3000/faq

# With quality values
curl -H "Accept-Language: fa-IR,fa;q=0.9,en;q=0.8" http://localhost:3000/faq
```

### Example Response

```json
{
  "data": [
    {
      "id": "123",
      "question": "What is this service?",
      "answer": "This is a service that helps users...",
      "order": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

## Complete Example: FAQ Module

The FAQ module has been fully implemented as a reference. Related files:

- Entity: `src/faq/entities/faq.entity.ts`
- DTOs: `src/faq/dto/*.dto.ts`
- Service: `src/faq/faq.service.ts`
- Controller: `src/faq/faq.controller.ts`
- Migration: `src/migrations/*-UpdateFaqTableForMultilingual.ts`

## Important Notes

1. **Fallback Strategy**: If the requested language is not available, falls back to English, then the first available language
2. **Database Type**: Use `jsonb` in PostgreSQL for better performance
3. **Search Performance**: Consider creating indexes on JSON fields for heavy search operations
4. **Validation**: At least one language should be provided when creating content

## Applying to Other Modules

To apply this pattern to other modules (e.g., Ticket, Notification):

1. Identify which fields need translation
2. Create appropriate migration
3. Update DTOs
4. Modify Service for localization
5. Use `@Language()` decorator in Controller

---

*Created: November 2025*
*API Version: 1.0*

