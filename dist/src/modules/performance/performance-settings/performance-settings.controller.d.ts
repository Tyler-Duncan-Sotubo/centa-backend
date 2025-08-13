import { PerformanceSettingsService } from './performance-settings.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class PerformanceSettingsController extends BaseController {
    private readonly performanceSettingsService;
    constructor(performanceSettingsService: PerformanceSettingsService);
    getPerformanceSettings(user: User): Promise<{
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
    updatePerformanceSettings(user: User, key: string, value: any): Promise<any>;
}
