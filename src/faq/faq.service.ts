import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq, FaqTranslations } from './entities/faq.entity';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

export interface LocalizedFaq {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FaqService {
  private readonly supportedLanguages = ['en', 'fa', 'ar', 'tr'];
  private readonly defaultLanguage = 'en';

  constructor(
    @InjectRepository(Faq)
    private faqRepository: Repository<Faq>,
  ) {}

  private getTranslatedField(translations: FaqTranslations, language: string): string {
    // Try to get the requested language
    if (translations[language]) {
      return translations[language];
    }
    
    // Fallback to English
    if (translations[this.defaultLanguage]) {
      return translations[this.defaultLanguage];
    }
    
    // If English is not available, return the first available translation
    for (const lang of this.supportedLanguages) {
      if (translations[lang]) {
        return translations[lang];
      }
    }
    
    return '';
  }

  private localizeFaq(faq: Faq, language: string): LocalizedFaq {
    return {
      id: faq.id,
      question: this.getTranslatedField(faq.question, language),
      answer: this.getTranslatedField(faq.answer, language),
      isActive: faq.isActive,
      order: faq.order,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    };
  }

  async create(createFaqDto: CreateFaqDto): Promise<Faq> {
    const faq = this.faqRepository.create(createFaqDto);
    return await this.faqRepository.save(faq);
  }

  async findAll(
    page = 1,
    limit = 10,
    language: string = this.defaultLanguage,
    query?: string,
  ): Promise<{ faqs: LocalizedFaq[]; total: number }> {
    const qb = this.faqRepository.createQueryBuilder('faq')
      .where('faq.isActive = :isActive', { isActive: true })
      .orderBy('faq.order', 'ASC');

    // Search in JSON fields for the current language and fallback languages
    if (query) {
      const searchPattern = `%${query.toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(CAST(faq.question->>'en' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.answer->>'en' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.question->>'fa' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.answer->>'fa' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.question->>'ar' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.answer->>'ar' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.question->>'tr' AS TEXT)) LIKE :searchPattern OR
          LOWER(CAST(faq.answer->>'tr' AS TEXT)) LIKE :searchPattern
        )`,
        { searchPattern }
      );
    }

    const [faqs, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Localize FAQs based on the requested language
    const localizedFaqs = faqs.map(faq => this.localizeFaq(faq, language));

    return { faqs: localizedFaqs, total };
  }

  async findOne(id: string, language: string = this.defaultLanguage): Promise<LocalizedFaq> {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException({
        message: 'faq.notFound',
        params: { id }
      });
    }
    return this.localizeFaq(faq, language);
  }

  async update(id: string, updateFaqDto: UpdateFaqDto): Promise<Faq> {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException({
        message: 'faq.notFound',
        params: { id }
      });
    }
    Object.assign(faq, updateFaqDto);
    return await this.faqRepository.save(faq);
  }

  async remove(id: string): Promise<void> {
    const result = await this.faqRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException({
        message: 'faq.notFound',
        params: { id }
      });
    }
  }
} 