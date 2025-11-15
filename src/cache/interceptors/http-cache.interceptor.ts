import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache-key.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKeyPrefix = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    // If no cache key is set, skip caching
    if (!cacheKeyPrefix) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { url, query, params, user } = request;

    // Generate cache key based on route, query params, and user
    const userId = user?.id || 'guest';
    const cacheKey = this.cacheService.generateKey(
      cacheKeyPrefix,
      userId,
      url,
      JSON.stringify(query),
      JSON.stringify(params),
    );

    // Try to get from cache
    const cachedResponse = await this.cacheService.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Get TTL from decorator or use default
    const ttl = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    // Execute the handler and cache the result
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, ttl);
      }),
    );
  }
}

