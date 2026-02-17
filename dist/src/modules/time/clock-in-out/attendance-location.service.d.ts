import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
export declare class AttendanceLocationService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private tags;
    pickTz(tz?: string): string;
    private isWithinRadius;
    checkLocation(latitude: string, longitude: string, employee: any): Promise<void>;
}
