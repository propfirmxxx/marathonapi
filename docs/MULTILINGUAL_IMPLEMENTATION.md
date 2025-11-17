# پیاده‌سازی سیستم چند زبانه (Multi-Language System)

## نمای کلی

این سیستم امکان ارائه محتوای چند زبانه را در API فراهم می‌کند. کاربران می‌توانند زبان دلخواه خود را از طریق هدر `Accept-Language` مشخص کنند و داده‌ها به زبان مورد نظر دریافت کنند.

## زبان‌های پشتیبانی شده

- `en` - انگلیسی (پیش‌فرض)
- `fa` - فارسی
- `ar` - عربی
- `tr` - ترکی

## معماری

### 1. Middleware (میان‌افزار)

فایل: `src/i18n/i18n.middleware.ts`

این middleware هدر `Accept-Language` را پردازش کرده و زبان مناسب را انتخاب می‌کند:

```typescript
// Priority order:
// 1. Accept-Language header (با پشتیبانی از quality values)
// 2. Cookie i18next
// 3. پیش‌فرض: انگلیسی
```

### 2. Language Decorator

فایل: `src/i18n/decorators/language.decorator.ts`

یک decorator سفارشی برای استخراج زبان از request:

```typescript
import { Language } from '../i18n/decorators/language.decorator';

@Get()
async findAll(@Language() language: string) {
  // language = 'en', 'fa', 'ar', or 'tr'
}
```

### 3. Translation Files

محل: `src/i18n/translations/`

- `en.json` - ترجمه‌های انگلیسی
- `fa.json` - ترجمه‌های فارسی
- `ar.json` - ترجمه‌های عربی
- `tr.json` - ترجمه‌های ترکی

## نحوه استفاده برای ماژول‌های جدید

### مرحله 1: طراحی Entity

از ستون‌های JSON برای ذخیره ترجمه‌ها استفاده کنید:

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

### مرحله 2: ایجاد Migration

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
          -- Add temp columns
          ALTER TABLE your_table 
          ADD COLUMN IF NOT EXISTS title_temp jsonb,
          ADD COLUMN IF NOT EXISTS description_temp jsonb;

          -- Migrate existing data (assuming English)
          UPDATE your_table 
          SET 
            title_temp = jsonb_build_object('en', title),
            description_temp = jsonb_build_object('en', description)
          WHERE title_temp IS NULL;

          -- Drop old columns
          ALTER TABLE your_table 
          DROP COLUMN IF EXISTS title,
          DROP COLUMN IF EXISTS description;

          -- Rename
          ALTER TABLE your_table 
          RENAME COLUMN title_temp TO title;
          
          ALTER TABLE your_table 
          RENAME COLUMN description_temp TO description;

          -- Set NOT NULL
          ALTER TABLE your_table 
          ALTER COLUMN title SET NOT NULL,
          ALTER COLUMN description SET NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Implement rollback logic
  }
}
```

### مرحله 3: به‌روزرسانی DTOs

```typescript
export class TranslationFieldsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  en?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fa?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ar?: string;

  @ApiProperty({ required: false })
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

### مرحله 4: به‌روزرسانی Service

```typescript
export interface LocalizedYourEntity {
  id: string;
  title: string;
  description: string;
  // ... other fields
}

@Injectable()
export class YourService {
  private readonly supportedLanguages = ['en', 'fa', 'ar', 'tr'];
  private readonly defaultLanguage = 'en';

  private getTranslatedField(
    translations: TranslationFields, 
    language: string
  ): string {
    // Try requested language
    if (translations[language]) {
      return translations[language];
    }
    
    // Fallback to English
    if (translations[this.defaultLanguage]) {
      return translations[this.defaultLanguage];
    }
    
    // Return first available
    for (const lang of this.supportedLanguages) {
      if (translations[lang]) {
        return translations[lang];
      }
    }
    
    return '';
  }

  private localizeEntity(
    entity: YourEntity, 
    language: string
  ): LocalizedYourEntity {
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

### مرحله 5: به‌روزرسانی Controller

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

## جستجو در فیلدهای JSON (PostgreSQL)

برای جستجو در تمام زبان‌ها:

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

## نحوه استفاده از API

### درخواست با هدر Accept-Language

```bash
# دریافت داده به فارسی
curl -H "Accept-Language: fa" http://localhost:3000/faq

# دریافت داده به عربی
curl -H "Accept-Language: ar" http://localhost:3000/faq

# دریافت داده به ترکی
curl -H "Accept-Language: tr" http://localhost:3000/faq

# با quality values
curl -H "Accept-Language: fa-IR,fa;q=0.9,en;q=0.8" http://localhost:3000/faq
```

### پاسخ نمونه

```json
{
  "data": [
    {
      "id": "123",
      "question": "این سرویس چیست؟",
      "answer": "این سرویسی است که به کاربران کمک می‌کند...",
      "order": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

## مثال کامل: ماژول FAQ

ماژول FAQ به عنوان مرجع کامل پیاده‌سازی شده است. فایل‌های مرتبط:

- Entity: `src/faq/entities/faq.entity.ts`
- DTOs: `src/faq/dto/*.dto.ts`
- Service: `src/faq/faq.service.ts`
- Controller: `src/faq/faq.controller.ts`
- Migration: `src/migrations/*-UpdateFaqTableForMultilingual.ts`

## نکات مهم

1. **Fallback Strategy**: اگر زبان درخواستی موجود نیست، به انگلیسی و سپس اولین زبان موجود بازمی‌گردد
2. **Database Type**: از `jsonb` در PostgreSQL برای عملکرد بهتر استفاده شود
3. **Search Performance**: برای جستجوهای سنگین، ایجاد index روی فیلدهای JSON را در نظر بگیرید
4. **Validation**: حداقل یک زبان باید در هنگام ایجاد محتوا ارائه شود

## اعمال در سایر ماژول‌ها

برای اعمال این الگو در ماژول‌های دیگر (مثل Ticket، Notification و غیره):

1. مشخص کنید کدام فیلدها نیاز به ترجمه دارند
2. Migration مناسب بسازید
3. DTOs را به‌روزرسانی کنید
4. Service را برای localization تغییر دهید
5. از decorator `@Language()` در Controller استفاده کنید

---

*تاریخ ایجاد: نوامبر 2025*
*نسخه API: 1.0*

