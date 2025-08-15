import { CandidatesService } from './candidates.service';
export declare class CandidatesController {
    private readonly candidatesService;
    constructor(candidatesService: CandidatesService);
    findAll(search?: string, limit?: string, offset?: string, sortBy?: string, sortDirection?: 'asc' | 'desc'): Promise<{
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        resumeUrl: string | null;
        profile: unknown;
        skills: string[];
    }[]>;
    findOne(id: string): string;
}
