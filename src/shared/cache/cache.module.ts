import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Global cache module — registers CacheService once and exports it
 * everywhere, so any feature module can inject it without re-importing.
 *
 * To upgrade to Redis later:
 *   1. Install ioredis / @nestjs/cache-manager
 *   2. Swap the Map-based methods inside CacheService with Redis calls
 *   3. No changes needed in any feature service
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
