// src/cache/cache.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

/**
 * Versioned + (optionally) tagged cache on top of cache-manager v6.
 *
 * - Versioned keys: company:{companyId}:v{ver}:...
 *   Bump the version on writes to effectively invalidate old keys without wildcards.
 * - Optional tag invalidation: only enabled when a native Redis client is detected.
 */
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

  // ---------------------------------------------------------------------------
  // Low-level helpers (existing API)
  // ---------------------------------------------------------------------------

  async getOrSetCache<T>(
    key: string,
    loadFn: () => Promise<T>,
    opts?: { ttlSeconds?: number },
  ): Promise<T> {
    const hit = await this.cacheManager.get<T>(key);
    if (hit !== undefined && hit !== null) {
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

  // ---------------------------------------------------------------------------
  // Versioned cache API
  // ---------------------------------------------------------------------------

  /** Build a versioned key: company:{companyId}:v{ver}:{...parts} */
  buildVersionedKey(companyId: string, ver: number, ...parts: string[]) {
    return ['company', companyId, `v${ver}`, ...parts].join(':');
  }

  /** Redis/native client extraction (if available) */
  private getRedisClient(): any | null {
    const anyCache: any = this.cacheManager as any;
    // v6 often has stores[]
    const stores: any[] =
      anyCache?.stores ?? (anyCache?.store ? [anyCache.store] : []);
    const first = stores[0] ?? anyCache?.store;
    // KeyvRedis exposes .store.redis / .store.client depending on impl; legacy store has .client
    const client =
      first?.store?.redis || first?.store?.client || first?.client || null;
    return client ?? null;
  }

  /** Get the current company version (initialize to 1 if missing). */
  async getCompanyVersion(companyId: string): Promise<number> {
    const versionKey = `company:${companyId}:ver`;
    const client = this.getRedisClient();

    // Prefer native Redis GET for predictable semantics
    if (client?.get) {
      const raw = await client.get(versionKey);
      if (raw) return Number(raw);
      // init to 1 without TTL (version should be persistent)
      if (client.set) await client.set(versionKey, '1');
      return 1;
    }

    // Fallback via cache-manager (may apply default TTL)
    const raw = await this.cacheManager.get<string>(versionKey);
    if (raw) return Number(raw);
    await this.cacheManager.set(versionKey, '1'); // may get default ttl; acceptable
    return 1;
  }

  /**
   * Atomically bump the company version (if Redis client is available).
   * Falls back to non-atomic read-modify-write with a warning.
   */
  async bumpCompanyVersion(companyId: string): Promise<number> {
    const versionKey = `company:${companyId}:ver`;
    const client = this.getRedisClient();

    if (client?.incr) {
      const v = await client.incr(versionKey);
      // ensure version key is persistent; avoid TTL on version
      return Number(v);
    }

    // Fallback (non-atomic)
    this.logger.warn(
      `bumpCompanyVersion: Redis INCR not available; falling back to non-atomic bump for company=${companyId}`,
    );
    const current = await this.getCompanyVersion(companyId);
    const next = current + 1;
    await this.cacheManager.set(versionKey, String(next));
    return next;
  }

  /**
   * Versioned get-or-set: reads the current company version, builds a versioned key,
   * and caches the computed value under that key. Old keys become irrelevant after a bump.
   */
  async getOrSetVersioned<T>(
    companyId: string,
    keyParts: string[],
    compute: () => Promise<T>,
    opts?: { ttlSeconds?: number; tags?: string[] }, // tags optional; only effective with Redis
  ): Promise<T> {
    const ver = await this.getCompanyVersion(companyId);
    const key = this.buildVersionedKey(companyId, ver, ...keyParts);
    const hit = await this.cacheManager.get<T>(key);
    if (hit !== undefined && hit !== null) return hit;

    const val = await compute();
    const ttl = opts?.ttlSeconds ? opts.ttlSeconds * 1000 : this.ttlMs;

    // Store value
    await this.cacheManager.set(key, val as any, ttl);

    // Optionally attach tags if Redis is available
    if (opts?.tags?.length) {
      await this.attachTags(key, opts.tags);
    }

    return val;
  }

  // ---------------------------------------------------------------------------
  // Tagging API (no-ops if not on native Redis)
  // ---------------------------------------------------------------------------

  private async attachTags(cacheKey: string, tags: string[]) {
    const client = this.getRedisClient();
    if (!client?.sadd) {
      this.logger.debug(
        `attachTags: Redis SADD not available; skipping tags for ${cacheKey}`,
      );
      return;
    }
    const pipe = client.multi?.() ?? client.pipeline?.();
    for (const tag of tags) {
      pipe.sadd(`tag:${tag}`, cacheKey);
    }
    await pipe.exec();
  }

  /**
   * Invalidate all cache entries for the provided tags (and clear the tag sets).
   * No-op if Redis set commands aren’t available.
   */
  async invalidateTags(tags: string[]) {
    const client = this.getRedisClient();
    if (!client?.smembers) {
      this.logger.debug(
        'invalidateTags: Redis SMEMBERS not available; skipping tag invalidation',
      );
      return;
    }
    const keysToDelete: string[] = [];
    for (const tag of tags) {
      const tkey = `tag:${tag}`;
      const members: string[] = await client.smembers(tkey);
      if (members?.length) keysToDelete.push(...members);
    }
    if (keysToDelete.length) {
      await client.del(...keysToDelete);
    }
    // clean tag sets
    const delPipe = client.multi?.() ?? client.pipeline?.();
    for (const tag of tags) delPipe.del(`tag:${tag}`);
    await delPipe.exec();
  }

  // ---------------------------------------------------------------------------
  // Debug info (as you had)
  // ---------------------------------------------------------------------------

  async debugInfo() {
    const anyCache: any = this.cacheManager as any;
    const stores: any[] =
      anyCache?.stores ?? (anyCache?.store ? [anyCache.store] : []);
    const first = stores[0];

    const keyv =
      first && first instanceof Object && 'store' in first ? first : null;
    const keyvStore: any = keyv?.store ?? null;

    const legacyStore: any = anyCache?.store;
    const legacyClient = legacyStore?.client;

    const isKeyvRedis =
      !!keyvStore &&
      (keyvStore.constructor?.name?.toLowerCase().includes('redis') ||
        (typeof keyvStore?.opts?.url === 'string' &&
          keyvStore.opts.url.startsWith('redis://')));

    const isLegacyRedis = !!legacyClient;

    return {
      mode: stores.length
        ? 'v6-multi-store'
        : legacyClient
          ? 'legacy-single-store'
          : 'unknown',
      storeCount: stores.length || (legacyClient ? 1 : 0),
      isRedisStore: isKeyvRedis || isLegacyRedis,
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
