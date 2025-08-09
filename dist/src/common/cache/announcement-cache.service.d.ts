import { CacheService } from 'src/common/cache/cache.service';
export declare class AnnouncementCacheService {
    private readonly cache;
    constructor(cache: CacheService);
    listKey(companyId: string): string;
    listTwoKey(companyId: string): string;
    detailPrefix(announcementId: string): string;
    invalidateLists(companyId: string): Promise<void>;
}
