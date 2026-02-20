import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  /** Backing store: key → { value, expiresAt: epoch-ms } */
  private readonly store = new Map<string, CacheEntry>();
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }
  del(key: string): void {
    this.store.delete(key);
  }
  delByPrefix(prefix: string): void {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(
        `Cache invalidated: ${count} entr${count === 1 ? 'y' : 'ies'} with prefix "${prefix}"`,
      );
    }
  }

  // ─── High-level helper ────────────────────────────────────────────

  /**
   * Cache-aside pattern.
   *
   * 1. Return cached value if present and not expired.
   * 2. Otherwise call `loader`, store the result, and return it.
   *
   * Exceptions thrown by `loader` propagate normally; nothing is cached.
   *
   * @param key     Unique cache key
   * @param loader  Async function that fetches from the DB on a miss
   * @param ttlMs   Time-to-live in milliseconds
   *
   * @example
   *   const courses = await this.cache.wrap(
   *     `courses:public:list:${page}:${limit}:${search}`,
   *     () => this.repo.findPublished({ skip, take: limit, search }),
   *     5 * 60_000,
   *   );
   */
  async wrap<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await loader();
    this.set(key, fresh, ttlMs);
    return fresh;
  }
}
