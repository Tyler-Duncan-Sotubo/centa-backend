import { CandidatesService } from './candidates.service';
export declare class CandidatesController {
    private readonly candidatesService;
    constructor(candidatesService: CandidatesService);
    findAll(search?: string, limit?: string, offset?: string, sortBy?: string, sortDirection?: 'asc' | 'desc'): Promise<any[]>;
    findOne(id: string): string;
}
