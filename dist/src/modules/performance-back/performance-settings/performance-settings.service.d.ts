import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PerformanceSettingsService {
    private readonly companySettingsService;
    private readonly logger;
    private readonly cache;
    constructor(companySettingsService: CompanySettingsService, logger: PinoLogger, cache: CacheService);
    private allKey;
    private summaryKey;
    private burst;
    getAllPerformanceSettings(companyId: string): Promise<Record<string, any>>;
    getPerformanceSettings(companyId: string): Promise<{
        autoCreateCycles: boolean;
        reviewFrequency: any;
        enableSelfReview: boolean;
        requireReviewRating: boolean;
        reviewScoreScale: number;
        notifyReviewOverdue: any;
        notifyReviewUpcoming: any;
        reviewReminderOffsetDays: number;
        notifyGoalUpdatedByEmployee: any;
        goalReminderFrequency: any;
        autoCreateAppraisals: boolean;
        appraisalFrequency: any;
        appraisalIncludeNewEmployees: boolean;
        defaultManagerAssignment: boolean;
        allowManagerOverride: boolean;
        autoFinalizeDeadlineDays: number;
    }>;
    updatePerformanceSetting(companyId: string, key: string, value: any): Promise<void>;
}
