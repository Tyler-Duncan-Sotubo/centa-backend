import { FeedbackSettingsService } from './feedback-settings.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateFeedbackRuleDto } from '../dto/update-feedback-rule.dto';
export declare class FeedbackSettingsController extends BaseController {
    private readonly feedbackSettingsService;
    constructor(feedbackSettingsService: FeedbackSettingsService);
    findOne(user: User): Promise<{
        id?: undefined;
        companyId?: undefined;
        enableEmployeeFeedback?: undefined;
        enableManagerFeedback?: undefined;
        allowAnonymous?: undefined;
        createdAt?: undefined;
        updatedAt?: undefined;
        rules?: undefined;
    } | {
        id: string;
        companyId: string;
        enableEmployeeFeedback: boolean | null;
        enableManagerFeedback: boolean | null;
        allowAnonymous: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        rules: Record<"manager" | "employee", any[]>;
    }>;
    updateTopLevel(dto: any, user: User): Promise<{
        id: string;
        companyId: string;
        enableEmployeeFeedback: boolean | null;
        enableManagerFeedback: boolean | null;
        allowAnonymous: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    updateRule(dto: UpdateFeedbackRuleDto, user: User): Promise<{
        success: boolean;
    }>;
    create(): Promise<void>;
}
