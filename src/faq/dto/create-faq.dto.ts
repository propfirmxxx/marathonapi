import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FaqTranslationsDto {
  @ApiProperty({
    description: 'English translation',
    example: 'What is this service?',
    required: false
  })
  @IsOptional()
  @IsString()
  en?: string;

  @ApiProperty({
    description: 'Persian (Farsi) translation',
    example: 'این سرویس چیست؟',
    required: false
  })
  @IsOptional()
  @IsString()
  fa?: string;

  @ApiProperty({
    description: 'Arabic translation',
    example: 'ما هي هذه الخدمة؟',
    required: false
  })
  @IsOptional()
  @IsString()
  ar?: string;

  @ApiProperty({
    description: 'Turkish translation',
    example: 'Bu hizmet nedir?',
    required: false
  })
  @IsOptional()
  @IsString()
  tr?: string;
}

export class CreateFaqDto {
  @ApiProperty({
    description: 'FAQ question in multiple languages',
    example: {
      en: 'What is this service?',
      fa: 'این سرویس چیست؟',
      ar: 'ما هي هذه الخدمة؟',
      tr: 'Bu hizmet nedir?'
    }
  })
  @IsObject()
  @ValidateNested()
  @Type(() => FaqTranslationsDto)
  question: FaqTranslationsDto;

  @ApiProperty({
    description: 'FAQ answer in multiple languages',
    example: {
      en: 'This is a service that helps users...',
      fa: 'این سرویسی است که به کاربران کمک می‌کند...',
      ar: 'هذه خدمة تساعد المستخدمين...',
      tr: 'Bu, kullanıcılara yardımcı olan bir hizmettir...'
    }
  })
  @IsObject()
  @ValidateNested()
  @Type(() => FaqTranslationsDto)
  answer: FaqTranslationsDto;

  @ApiProperty({
    description: 'FAQ display order',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
} 