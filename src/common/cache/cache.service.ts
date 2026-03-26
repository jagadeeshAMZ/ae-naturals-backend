import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600000, // 1 hour (ms)
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);

    if (cached) {
      return cached;
    }

    const result = await fn();

    await this.cacheManager.set(key, result, ttl);

    return result;
  }

  async get<T>(key: string): Promise<T | null> {
  const value = await this.cacheManager.get<T>(key);
  return value ?? null;
}

  async set(key: string, value: any, ttl: number = 3600000) {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }
}