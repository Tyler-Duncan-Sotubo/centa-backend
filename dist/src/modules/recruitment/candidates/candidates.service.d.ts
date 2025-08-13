import { db } from 'src/drizzle/types/drizzle';
interface FindCandidatesOptions {
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}
export declare class CandidatesService {
    private readonly db;
    constructor(db: db);
    findAll(options?: FindCandidatesOptions): Promise<any[]>;
    findOne(id: number): string;
}
export {};
