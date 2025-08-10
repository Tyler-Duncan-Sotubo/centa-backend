import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
export declare class CacheService {
    private readonly cacheManager;
    private readonly config;
    private readonly ttlMs;
    private readonly logger;
    constructor(cacheManager: Cache, config: ConfigService);
    getOrSetCache<T>(key: string, loadFn: () => Promise<T>, opts?: {
        ttlSeconds?: number;
    }): Promise<T>;
    get<T = any>(key: string): Promise<T | undefined>;
    set<T = any>(key: string, value: T, options?: {
        ttlSeconds?: number;
    }): Promise<void>;
    del(key: string): Promise<void>;
    buildVersionedKey(companyId: string, ver: number, ...parts: string[]): string;
    private getRedisClient;
    getCompanyVersion(companyId: string): Promise<number>;
    bumpCompanyVersion(companyId: string): Promise<number>;
    getOrSetVersioned<T>(companyId: string, keyParts: string[], compute: () => Promise<T>, opts?: {
        ttlSeconds?: number;
        tags?: string[];
    }): Promise<T>;
    private attachTags;
    invalidateTags(tags: string[]): Promise<void>;
    debugInfo(): Promise<{
        mode: string;
        storeCount: number;
        isRedisStore: any;
        details: {
            kind: any;
            url: any;
            keyPrefix: any;
            isOpen?: undefined;
            host?: undefined;
            port?: undefined;
            db?: undefined;
            username?: undefined;
        } | {
            kind: any;
            isOpen: any;
            host: any;
            port: any;
            db: any;
            username: any;
            keyPrefix: any;
            url?: undefined;
        } | null;
    }>;
}
