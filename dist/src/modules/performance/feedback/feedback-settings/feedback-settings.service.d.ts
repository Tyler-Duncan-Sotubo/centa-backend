import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { UpdateFeedbackRuleDto } from '../dto/update-feedback-rule.dto';
import { UpdateFeedbackSettingsDto } from '../dto/update-feedback-settings.dto';
import { CacheService } from 'src/common/cache/cache.service';
export declare class FeedbackSettingsService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    private readonly ttlSeconds;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private tags;
    private invalidate;
    create(companyId: string): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        enableEmployeeFeedback: boolean | null;
        enableManagerFeedback: boolean | null;
        allowAnonymous: boolean | null;
    }>;
    seedCompanies(): Promise<void>;
    findOne(companyId: string): Promise<{
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
        rules: Record<"employee" | "manager", any[]>;
    }>;
    update(companyId: string, dto: UpdateFeedbackSettingsDto, user: User): Promise<{
        id: string;
        companyId: string;
        enableEmployeeFeedback: boolean | null;
        enableManagerFeedback: boolean | null;
        allowAnonymous: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    updateSingleRule(companyId: string, dto: UpdateFeedbackRuleDto, user: User): Promise<{
        success: boolean;
    }>;
}
