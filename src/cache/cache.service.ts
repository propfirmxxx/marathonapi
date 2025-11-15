import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const store = (this.cacheManager as any).store;
    // Access the Redis client from the store
    if (store && 'client' in store && typeof store.client === 'object' && store.client) {
      const client = store.client as any;
      if (typeof client.keys === 'function') {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.del(key)));
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    const resetMethod = (this.cacheManager as any).reset;
    if (typeof resetMethod === 'function') {
      await resetMethod.call(this.cacheManager);
    }
  }

  /**
   * Wrap a function with caching logic
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...args: (string | number)[]): string {
    return `${prefix}:${args.join(':')}`;
  }
}

