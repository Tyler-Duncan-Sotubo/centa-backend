// src/cache/cache.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly ttlMs: number;
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly config: ConfigService,
  ) {
    // CACHE_TTL provided in SECONDS -> convert to MS for cache-manager v6
    const ttlSeconds = parseInt(this.config.get('CACHE_TTL') ?? '86400', 10); // default 24h
    this.ttlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 86400 * 1000;
    this.logger.debug(`Cache TTL set to ${this.ttlMs} ms`);
  }

  /**
   * Get or set a cached value.
   * Uses the service default TTL unless overridden via opts.
   */
  async getOrSetCache<T>(
    key: string,
    loadFn: () => Promise<T>,
    opts?: { ttlSeconds?: number },
  ): Promise<T> {
    const hit = await this.cacheManager.get<T>(key);
    if (hit !== undefined && hit !== null) {
      // v6 returns the stored value directly (no JSON parsing needed)
      return hit;
    }

    const data = await loadFn();
    const ttl = opts?.ttlSeconds ? opts.ttlSeconds * 1000 : this.ttlMs;
    await this.cacheManager.set(key, data as any, ttl);
    return data;
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    return (await this.cacheManager.get<T>(key)) ?? undefined;
  }

  async set<T = any>(key: string, value: T, options?: { ttlSeconds?: number }) {
    const ttl = options?.ttlSeconds ? options.ttlSeconds * 1000 : this.ttlMs;
    await this.cacheManager.set(key, value as any, ttl);
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }

  /**
   * Debug info for the underlying cache store.
   * Supports both legacy (single store) and v6 (Keyv stores[]) shapes.
   */
  async debugInfo() {
    const anyCache: any = this.cacheManager as any;

    // cache-manager v6 usually exposes an array of Keyv stores
    const stores: any[] =
      anyCache?.stores ?? (anyCache?.store ? [anyCache.store] : []);
    const first = stores[0];

    // If it's Keyv, it will have .store (the adapter, e.g., KeyvRedis)
    const keyv =
      first && first instanceof Object && 'store' in first ? first : null;
    const keyvStore: any = keyv?.store ?? null;

    // Legacy (v5) redisStore (node-redis) exposed .client
    const legacyStore: any = anyCache?.store;
    const legacyClient = legacyStore?.client;

    // Heuristics to detect Redis
    const isKeyvRedis =
      !!keyvStore &&
      (keyvStore.constructor?.name?.toLowerCase().includes('redis') ||
        (typeof keyvStore?.opts?.url === 'string' &&
          keyvStore.opts.url.startsWith('redis://')));

    const isLegacyRedis = !!legacyClient;

    return {
      // shape hints
      mode: stores.length
        ? 'v6-multi-store'
        : legacyClient
          ? 'legacy-single-store'
          : 'unknown',
      storeCount: stores.length || (legacyClient ? 1 : 0),

      // detection
      isRedisStore: isKeyvRedis || isLegacyRedis,

      // details (best-effort)
      details: isKeyvRedis
        ? {
            kind: keyvStore?.constructor?.name,
            url: keyvStore?.opts?.url,
            keyPrefix: keyvStore?.opts?.keyPrefix,
          }
        : isLegacyRedis
          ? {
              kind: legacyStore?.name ?? 'legacy-redis',
              isOpen: legacyClient?.isOpen,
              host: legacyClient?.options?.socket?.host,
              port: legacyClient?.options?.socket?.port,
              db: legacyClient?.options?.database ?? 0,
              username: legacyClient?.options?.username ?? undefined,
              keyPrefix: legacyStore?.options?.keyPrefix ?? undefined,
            }
          : null,
    };
  }
}
