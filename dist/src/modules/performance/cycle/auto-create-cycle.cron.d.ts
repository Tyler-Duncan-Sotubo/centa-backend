import { CompanyService } from 'src/modules/core/company/company.service';
import { PerformanceSettingsService } from '../performance-settings/performance-settings.service';
import { CycleService } from './cycle.service';
export declare class AutoCreateCycleCronService {
    private readonly settingsService;
    private readonly cycleService;
    private readonly companyService;
    private readonly logger;
    constructor(settingsService: PerformanceSettingsService, cycleService: CycleService, companyService: CompanyService);
    handleAutoCycleCreation(): Promise<void>;
    private generateNextCycleRange;
}
