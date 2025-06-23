import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
export declare class CacheService {
    private cacheManager;
    private readonly configService;
    private ttl;
    constructor(cacheManager: Cache, configService: ConfigService);
    getOrSetCache<T>(key: string, loadFn: () => Promise<T>): Promise<T>;
    get(key: string): Promise<any>;
    set(key: string, value: any, options?: {
        ttl: number;
    }): Promise<void>;
    del(key: string): Promise<void>;
}
