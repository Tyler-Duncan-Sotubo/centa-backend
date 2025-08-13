import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class PerformanceSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService);
    private ttlSeconds;
    private tags;
    getAllPerformanceSettings(companyId: string): Promise<Record<string, any>>;
    getPerformanceSettings(companyId: string): Promise<{
        autoCreateCycles: boolean;
        reviewFrequency: any;
        enableSelfReview: boolean;
        requireReviewRating: boolean;
        reviewScoreScale: number;
        notifyReviewOverdue: any[];
        notifyReviewUpcoming: any[];
        reviewReminderOffsetDays: number;
        notifyGoalUpdatedByEmployee: any[];
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
