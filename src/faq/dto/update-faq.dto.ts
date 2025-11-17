import { IsOptional, IsBoolean, IsNumber, Min, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FaqTranslationsDto } from './create-faq.dto';

export class UpdateFaqDto {
  @ApiProperty({
    description: 'FAQ question in multiple languages',
    example: {
      en: 'What is this service?',
      fa: 'این سرویس چیست؟',
      ar: 'ما هي هذه الخدمة؟',
      tr: 'Bu hizmet nedir?'
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FaqTranslationsDto)
  question?: FaqTranslationsDto;

  @ApiProperty({
    description: 'FAQ answer in multiple languages',
    example: {
      en: 'This is a service that helps users...',
      fa: 'این سرویسی است که به کاربران کمک می‌کند...',
      ar: 'هذه خدمة تساعد المستخدمين...',
      tr: 'Bu, kullanıcılara yardımcı olan bir hizmettir...'
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FaqTranslationsDto)
  answer?: FaqTranslationsDto;

  @ApiProperty({
    description: 'FAQ active status',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'FAQ display order',
    example: 1,
    required: false
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;
} 