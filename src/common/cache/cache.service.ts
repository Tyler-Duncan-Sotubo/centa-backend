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
  // Low-level helpers
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
    const stores: any[] =
      anyCache?.stores ?? (anyCache?.store ? [anyCache.store] : []);
    const first = stores[0] ?? anyCache?.store;
    const client =
      first?.store?.redis || first?.store?.client || first?.client || null;
    return client ?? null;
  }

  /** Safe Redis helper: fall back to alternative if Redis fails */
  private async safeRedisCall<T>(
    fn: (client: any) => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T | undefined> {
    const client = this.getRedisClient();
    if (!client) {
      if (fallback) return fallback();
      return undefined;
    }

    try {
      return await fn(client);
    } catch (err) {
      this.logger.warn(`Redis operation failed: ${(err as Error).message}`);
      if (fallback) return fallback();
      return undefined;
    }
  }

  /** Get the current company version (initialize to 1 if missing). */
  async getCompanyVersion(companyId: string): Promise<number> {
    const versionKey = `company:${companyId}:ver`;

    return (await this.safeRedisCall(
      async (client) => {
        const raw = await client.get(versionKey);
        if (raw) return Number(raw);
        if (client.set) await client.set(versionKey, '1');
        return 1;
      },
      async () => {
        const raw = await this.cacheManager.get<string>(versionKey);
        if (raw) return Number(raw);
        await this.cacheManager.set(versionKey, '1');
        return 1;
      },
    )) as number;
  }

  /** Atomically bump the company version, fallback non-atomic */
  async bumpCompanyVersion(companyId: string): Promise<number> {
    const versionKey = `company:${companyId}:ver`;

    return (await this.safeRedisCall(
      async (client) => {
        if (!client.incr) throw new Error('INCR not available');
        const v = await client.incr(versionKey);
        return Number(v);
      },
      async () => {
        this.logger.warn(
          `bumpCompanyVersion: falling back to non-atomic increment for company=${companyId}`,
        );
        const current = await this.getCompanyVersion(companyId);
        const next = current + 1;
        await this.cacheManager.set(versionKey, String(next));
        return next;
      },
    )) as number;
  }

  /** Versioned get-or-set */
  async getOrSetVersioned<T>(
    companyId: string,
    keyParts: string[],
    compute: () => Promise<T>,
    opts?: { ttlSeconds?: number; tags?: string[] },
  ): Promise<T> {
    const ver = await this.getCompanyVersion(companyId);
    const key = this.buildVersionedKey(companyId, ver, ...keyParts);
    const hit = await this.cacheManager.get<T>(key);
    if (hit !== undefined && hit !== null) return hit;

    const val = await compute();
    const ttl = opts?.ttlSeconds ? opts.ttlSeconds * 1000 : this.ttlMs;
    await this.cacheManager.set(key, val as any, ttl);

    if (opts?.tags?.length) {
      await this.attachTags(key, opts.tags);
    }

    return val;
  }

  async resetCompanyVersion(companyId: string): Promise<number> {
    const versionKey = `company:${companyId}:ver`;

    return (await this.safeRedisCall(
      async (client) => {
        await client.set(versionKey, '1');
        return 1;
      },
      async () => {
        await this.cacheManager.set(versionKey, '1');
        return 1;
      },
    )) as number;
  }

  // ---------------------------------------------------------------------------
  // Tagging API
  // ---------------------------------------------------------------------------

  private async attachTags(cacheKey: string, tags: string[]) {
    await this.safeRedisCall(
      async (client) => {
        if (!client.sadd) return;
        const pipe = client.multi?.() ?? client.pipeline?.();
        for (const tag of tags) {
          pipe.sadd(`tag:${tag}`, cacheKey);
        }
        await pipe.exec();
      },
      async () => {
        this.logger.debug(
          `attachTags: Redis not available; skipping tags for ${cacheKey}`,
        );
      },
    );
  }

  async invalidateTags(tags: string[]) {
    await this.safeRedisCall(
      async (client) => {
        if (!client.smembers) return;
        const keysToDelete: string[] = [];
        for (const tag of tags) {
          const members: string[] = await client.smembers(`tag:${tag}`);
          if (members?.length) keysToDelete.push(...members);
        }
        if (keysToDelete.length) await client.del(...keysToDelete);

        // clean tag sets
        const delPipe = client.multi?.() ?? client.pipeline?.();
        for (const tag of tags) delPipe.del(`tag:${tag}`);
        await delPipe.exec();
      },
      async () => {
        this.logger.debug(
          `invalidateTags: Redis not available; skipping tag invalidation`,
        );
      },
    );
  }
}
