import { db } from 'src/drizzle/types/drizzle';
import { CycleService } from '../cycle/cycle.service';
import { CompanyService } from 'src/modules/core/company/company.service';
export declare class GoalRolloverCronService {
    private readonly db;
    private readonly companyService;
    private readonly cycleService;
    private readonly logger;
    constructor(db: db, companyService: CompanyService, cycleService: CycleService);
    handleRollover(): Promise<void>;
}
