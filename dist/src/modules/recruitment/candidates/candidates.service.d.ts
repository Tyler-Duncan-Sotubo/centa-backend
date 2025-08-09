import { db } from 'src/drizzle/types/drizzle';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
interface FindCandidatesOptions {
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}
export declare class CandidatesService {
    private readonly db;
    private readonly logger;
    private readonly cache;
    constructor(db: db, logger: PinoLogger, cache: CacheService);
    private listKey;
    private oneKey;
    findAll(options?: FindCandidatesOptions): Promise<any[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        resumeUrl: string | null;
        profile: unknown;
    }>;
}
export {};
