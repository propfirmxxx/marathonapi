# Redis Caching Implementation

This document describes the Redis caching system implemented in the Marathon API to improve performance.

## Overview

The caching system uses Redis as a distributed cache to store frequently accessed data and expensive computation results. This significantly reduces database queries and improves response times.

## Architecture

### Components

1. **CacheModule** (`src/cache/cache.module.ts`)
   - Global module that provides caching functionality throughout the application
   - Configured to use Redis as the caching backend
   - Uses `cache-manager-redis-yet` for Redis integration

2. **CacheService** (`src/cache/cache.service.ts`)
   - Provides methods for cache operations (get, set, delete, wrap)
   - Handles cache key generation
   - Supports pattern-based cache invalidation

3. **HttpCacheInterceptor** (`src/cache/interceptors/http-cache.interceptor.ts`)
   - Intercepts HTTP requests and responses
   - Automatically caches controller responses based on decorators
   - Generates cache keys based on route, query parameters, and user

4. **Decorators** (`src/cache/decorators/cache-key.decorator.ts`)
   - `@CacheKey(key)`: Set cache key prefix for a controller method
   - `@CacheTTL(ttl)`: Set custom TTL for cached data

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=         # Optional: Set if Redis requires authentication
CACHE_TTL=3600000       # Default cache TTL in milliseconds (1 hour)
```

### Docker Compose

Redis is automatically started as a Docker service with the following configuration:
- **Image**: redis:7-alpine
- **Port**: 6379
- **Memory Limit**: 512MB
- **Eviction Policy**: allkeys-lru (Least Recently Used)
- **Persistence**: AOF (Append Only File)

## Usage Examples

### Service-Level Caching

Use the `CacheService.wrap()` method to cache expensive operations:

```typescript
import { CacheService } from '../cache/cache.service';

@Injectable()
export class YourService {
  private readonly CACHE_PREFIX = 'your-service';
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(private cacheService: CacheService) {}

  async getExpensiveData(id: string) {
    const cacheKey = this.cacheService.generateKey(
      this.CACHE_PREFIX,
      'data',
      id,
    );

    return await this.cacheService.wrap(
      cacheKey,
      async () => {
        // Expensive operation (database query, API call, etc.)
        return await this.performExpensiveOperation(id);
      },
      this.CACHE_TTL,
    );
  }
}
```

### Controller-Level Caching

Use decorators to cache entire controller responses:

```typescript
import { CacheKey, CacheTTL } from '../cache/decorators/cache-key.decorator';
import { HttpCacheInterceptor } from '../cache/interceptors/http-cache.interceptor';

@Controller('your-resource')
@UseInterceptors(HttpCacheInterceptor)
export class YourController {
  @Get()
  @CacheKey('your-resource:list')
  @CacheTTL(600000) // 10 minutes
  async findAll(@Query() query: QueryDto) {
    return await this.service.findAll(query);
  }
}
```

### Cache Invalidation

#### Single Key Deletion

```typescript
await this.cacheService.del('cache-key');
```

#### Pattern-Based Deletion

```typescript
// Delete all FAQ list caches
await this.cacheService.delPattern('faq:list:*');
```

#### Clear All Cache

```typescript
await this.cacheService.reset();
```

## Implemented Caching

### FAQ Module

**Cached Operations:**
- `findAll()` - List of FAQs (1 hour TTL)
- `findOne()` - Single FAQ by ID (1 hour TTL)

**Cache Invalidation:**
- Cache is invalidated on create, update, and delete operations
- Pattern-based invalidation for list queries

**Cache Key Format:**
```
faq:list:{page}:{limit}:{query}
faq:single:{id}
```

### Stats Module

**Cached Operations:**
- `getWithdrawalStats()` - Withdrawal statistics (5 minutes TTL)
- `getMarathonStats()` - Marathon statistics (5 minutes TTL)
- `getOverviewStats()` - Overview statistics (5 minutes TTL)

**Cache Key Format:**
```
stats:withdrawal:{userId}:{startDate}:{endDate}:{groupBy}
stats:marathon:{userId}:{startDate}:{endDate}:{groupBy}
stats:overview:{userId}
```

**Rationale:** Stats change frequently, so a shorter TTL (5 minutes) is used to balance performance with data freshness.

## Performance Benefits

### Expected Improvements

1. **Response Time Reduction**: 50-90% for cached queries
2. **Database Load Reduction**: Up to 80% fewer queries for frequently accessed data
3. **Scalability**: Better handling of concurrent requests
4. **Cost Savings**: Reduced database resource usage

### Monitoring Cache Performance

To monitor Redis performance, connect to the Redis CLI:

```bash
docker exec -it marathonapi-redis-1 redis-cli

# Show cache statistics
INFO stats

# Monitor cache hits/misses
INFO stats | grep keyspace

# View all keys (use with caution in production)
KEYS *

# Get cache hit ratio
INFO stats | grep hit
```

## Best Practices

### When to Use Caching

✅ **Good candidates for caching:**
- Frequently accessed, rarely changing data (FAQs, categories)
- Expensive database queries or computations (statistics, reports)
- Data that can tolerate slight staleness (user profiles, dashboards)
- API responses with high read-to-write ratio

❌ **Avoid caching:**
- Real-time data that must be always current
- User-specific sensitive data (unless properly secured)
- Data with high write frequency
- Very large objects (>1MB)

### Cache Key Naming Convention

Use a hierarchical naming structure:
```
{module}:{operation}:{param1}:{param2}:...
```

Examples:
- `faq:list:1:10:all`
- `stats:overview:user-123`
- `marathon:leaderboard:marathon-456`

### TTL Guidelines

- **Static data** (FAQs, config): 1-24 hours
- **Semi-static data** (user profiles): 15-60 minutes
- **Dynamic data** (stats, dashboards): 1-5 minutes
- **Real-time data**: Don't cache or use very short TTL (< 1 minute)

### Cache Invalidation Strategies

1. **Time-based (TTL)**: Automatic expiration after set time
2. **Event-based**: Invalidate on create/update/delete operations
3. **Pattern-based**: Invalidate multiple related keys
4. **Manual**: Explicit cache clearing when needed

## Troubleshooting

### Redis Connection Issues

If the application can't connect to Redis:

1. Check Redis is running:
   ```bash
   docker ps | grep redis
   ```

2. Test Redis connection:
   ```bash
   docker exec -it marathonapi-redis-1 redis-cli ping
   ```

3. Check environment variables in `.env`

4. Review Redis logs:
   ```bash
   docker logs marathonapi-redis-1
   ```

### Cache Not Working

1. Verify CacheModule is imported in AppModule
2. Check CacheService is injected in your service
3. Ensure Redis is accessible from the application container
4. Verify cache keys are being generated correctly (check logs)

### Memory Issues

If Redis runs out of memory:

1. Check memory usage:
   ```bash
   docker exec -it marathonapi-redis-1 redis-cli INFO memory
   ```

2. Increase Redis memory limit in `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G  # Increase from 512M
   ```

3. Review cached data sizes
4. Adjust TTL values to expire data sooner
5. Consider implementing LRU eviction (already enabled)

## Future Enhancements

Potential improvements to the caching system:

1. **Cache Warming**: Pre-populate cache with frequently accessed data on startup
2. **Cache Analytics**: Track hit rates, miss rates, and popular keys
3. **Distributed Caching**: Redis Cluster for high availability
4. **Cache Compression**: Compress large cached objects
5. **Smart Cache Invalidation**: More granular invalidation based on data relationships
6. **Cache Layers**: Multi-level caching (memory + Redis)

## Security Considerations

1. **Sensitive Data**: Never cache passwords, tokens, or sensitive personal information
2. **User Isolation**: Ensure cache keys include user ID for user-specific data
3. **Redis Access**: Use Redis authentication in production
4. **Network Security**: Use encrypted connections for Redis in production

## References

- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [cache-manager Documentation](https://github.com/jaredwray/cacheable)

