// src/cache/cache.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private ttl: number;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.ttl = parseInt(configService.get('CACHE_TTL') || '86400', 10); // Default to 86400 if not provided
  }

  /**
   * Get or Set data in Redis cache.
   * @param key The key under which to store the data.
   * @param loadFn The function to load the data if not found in cache.
   * @param ttl Time-to-live in seconds (optional).
   */
  async getOrSetCache<T>(key: string, loadFn: () => Promise<T>): Promise<T> {
    // Check cache for data
    const cachedData = await this.cacheManager.get<string>(key);

    // Return cached data if exists
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Load fresh data using the provided function
    const data = await loadFn();

    // Cache the fresh data using TTL from environment variables
    await this.cacheManager.set(key, JSON.stringify(data), this.ttl);

    return data;
  }

  /**
   * Get data from Redis cache.
   * @param key The key to retrieve the cached data.
   */
  async get(key: string): Promise<any> {
    return this.cacheManager.get(key);
  }

  /**
   * Set data in Redis cache.
   * @param key The key under which to store the data.
   * @param value The data to store in the cache.
   * @param ttl Time-to-live in seconds (optional).
   */
  async set(key: string, value: any, options?: { ttl: number }): Promise<void> {
    await this.cacheManager.set(key, JSON.stringify(value), options?.ttl);
  }

  /**
   * Remove data from Redis cache.
   * @param key The key to delete from the cache.
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
