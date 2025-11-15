# Redis Cache - Quick Reference Guide

## 🚀 Common Commands

### Start Redis
```bash
docker-compose up -d redis
```

### Check Redis Status
```bash
docker ps | grep redis
docker exec -it marathonapi-redis-1 redis-cli ping
```

### View Redis Logs
```bash
docker logs -f marathonapi-redis-1
```

## 💻 Code Examples

### Basic Service Caching
```typescript
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MyService {
  constructor(private cacheService: CacheService) {}

  async getData(id: string) {
    return this.cacheService.wrap(
      `my-service:data:${id}`,
      async () => this.fetchDataFromDB(id),
      600000, // 10 minutes
    );
  }
}
```

### Cache Invalidation
```typescript
// Single key
await this.cacheService.del('cache-key');

// Pattern (all keys matching)
await this.cacheService.delPattern('my-service:*');

// All cache
await this.cacheService.reset();
```

### Controller Caching
```typescript
import { CacheKey, CacheTTL } from '../cache/decorators/cache-key.decorator';
import { HttpCacheInterceptor } from '../cache/interceptors/http-cache.interceptor';

@Controller('items')
@UseInterceptors(HttpCacheInterceptor)
export class ItemsController {
  @Get()
  @CacheKey('items:list')
  @CacheTTL(300000) // 5 minutes
  findAll() {
    return this.service.findAll();
  }
}
```

## 🔍 Redis CLI Commands

### Connect to Redis
```bash
docker exec -it marathonapi-redis-1 redis-cli
```

### Inside Redis CLI
```redis
# View all keys
KEYS *

# Get value
GET "cache-key"

# Delete key
DEL "cache-key"

# Check TTL (time to live)
TTL "cache-key"

# Clear all cache
FLUSHALL

# Get info
INFO
INFO stats
INFO memory

# Exit
exit
```

## 📊 Environment Variables

Add to `.env`:
```bash
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_TTL=3600000
```

## ⏱️ Recommended TTL Values

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Static content (FAQs) | 1-24 hours | Rarely changes |
| User profiles | 15-60 minutes | Occasionally updated |
| Statistics/Reports | 5-15 minutes | Frequently updated |
| Search results | 5-10 minutes | Dynamic content |
| API responses | 1-5 minutes | Real-time data |

## 🔑 Cache Key Patterns

### Pattern Format
```
{module}:{type}:{param1}:{param2}
```

### Examples
```
faq:list:1:10:all
faq:single:uuid-123
stats:overview:user-456
marathon:leaderboard:marathon-789
users:profile:user-123
```

## 🛠️ Troubleshooting

### Cache Not Working?
1. Check Redis is running: `docker ps | grep redis`
2. Test connection: `docker exec -it marathonapi-redis-1 redis-cli ping`
3. Verify env vars in `.env`
4. Check CacheService is injected

### Out of Memory?
```bash
# Check memory usage
docker exec -it marathonapi-redis-1 redis-cli INFO memory

# Increase limit in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 1G
```

### Clear Specific Cache
```bash
# Via CLI
docker exec -it marathonapi-redis-1 redis-cli KEYS "faq:*" | xargs docker exec -it marathonapi-redis-1 redis-cli DEL

# Via code
await this.cacheService.delPattern('faq:*');
```

## 📈 Performance Monitoring

### Check Cache Hit Rate
```bash
docker exec -it marathonapi-redis-1 redis-cli INFO stats | grep keyspace
```

### Monitor in Real-time
```bash
docker exec -it marathonapi-redis-1 redis-cli MONITOR
```

## ✅ Checklist for Adding Cache to New Module

- [ ] Import CacheService in your service constructor
- [ ] Define CACHE_PREFIX constant
- [ ] Define CACHE_TTL constant
- [ ] Wrap expensive operations with `cacheService.wrap()`
- [ ] Generate consistent cache keys with `generateKey()`
- [ ] Invalidate cache on create/update/delete
- [ ] Test cache hit and miss scenarios
- [ ] Document cache keys in your code

## 🔗 Documentation Links

- Full Documentation: `docs/REDIS_CACHING_IMPLEMENTATION.md`
- Implementation Summary: `REDIS_CACHE_SUMMARY.md`
- NestJS Caching: https://docs.nestjs.com/techniques/caching
- Redis Commands: https://redis.io/commands/

---

**Quick Tip**: Start with longer TTL values and reduce them if you notice stale data issues.

