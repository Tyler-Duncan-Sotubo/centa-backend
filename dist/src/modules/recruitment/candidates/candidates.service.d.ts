import { db } from 'src/drizzle/types/drizzle';
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
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private tags;
    findAll(options?: FindCandidatesOptions): Promise<{
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        resumeUrl: string | null;
        profile: unknown;
        skills: string[];
    }[]>;
    findOne(id: number): string;
}
export {};
