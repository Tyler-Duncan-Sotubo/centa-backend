import { CandidatesService } from './candidates.service';
export declare class CandidatesController {
    private readonly candidatesService;
    constructor(candidatesService: CandidatesService);
    findAll(search?: string, limit?: string, offset?: string, sortBy?: string, sortDirection?: 'asc' | 'desc'): Promise<any[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        resumeUrl: string | null;
        profile: unknown;
    }>;
}
