import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FaqService {
  private readonly CACHE_PREFIX = 'faq';
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(
    @InjectRepository(Faq)
    private faqRepository: Repository<Faq>,
    private cacheService: CacheService,
  ) {}

  async create(createFaqDto: CreateFaqDto): Promise<Faq> {
    const faq = this.faqRepository.create(createFaqDto);
    const result = await this.faqRepository.save(faq);
    
    // Invalidate all FAQ list cache
    await this.cacheService.delPattern(`${this.CACHE_PREFIX}:list:*`);
    
    return result;
  }

  async findAll(
    page = 1,
    limit = 10,
    query?: string,
  ): Promise<{ faqs: Faq[]; total: number }> {
    // Generate cache key based on parameters
    const cacheKey = this.cacheService.generateKey(
      this.CACHE_PREFIX,
      'list',
      page.toString(),
      limit.toString(),
      query || 'all',
    );

    // Try to get from cache
    return await this.cacheService.wrap(
      cacheKey,
      async () => {
        const qb = this.faqRepository.createQueryBuilder('faq')
          .where('faq.isActive = :isActive', { isActive: true })
          .orderBy('faq.order', 'ASC');

        if (query) {
          qb.andWhere('(LOWER(faq.question) LIKE :q OR LOWER(faq.answer) LIKE LOWER(:q))', { q: `%${query}%` });
        }

        const [faqs, total] = await qb
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

        return { faqs, total };
      },
      this.CACHE_TTL,
    );
  }

  async findOne(id: string): Promise<Faq> {
    const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, 'single', id);

    return await this.cacheService.wrap(
      cacheKey,
      async () => {
        const faq = await this.faqRepository.findOne({ where: { id } });
        if (!faq) {
          throw new NotFoundException({
            message: 'faq.notFound',
            params: { id }
          });
        }
        return faq;
      },
      this.CACHE_TTL,
    );
  }

  async update(id: string, updateFaqDto: UpdateFaqDto): Promise<Faq> {
    // First clear cache for this FAQ without throwing error if not found
    const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, 'single', id);
    await this.cacheService.del(cacheKey);
    
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException({
        message: 'faq.notFound',
        params: { id }
      });
    }
    
    Object.assign(faq, updateFaqDto);
    const result = await this.faqRepository.save(faq);
    
    // Invalidate all FAQ list cache
    await this.cacheService.delPattern(`${this.CACHE_PREFIX}:list:*`);
    
    return result;
  }

  async remove(id: string): Promise<void> {
    const result = await this.faqRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException({
        message: 'faq.notFound',
        params: { id }
      });
    }
    
    // Clear cache for this FAQ
    const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, 'single', id);
    await this.cacheService.del(cacheKey);
    
    // Invalidate all FAQ list cache
    await this.cacheService.delPattern(`${this.CACHE_PREFIX}:list:*`);
  }
} 