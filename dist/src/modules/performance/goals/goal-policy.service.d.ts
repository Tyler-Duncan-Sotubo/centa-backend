import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
import { Queue } from 'bullmq';
import { GoalNotificationService } from 'src/modules/notification/services/goal-notification.service';
export type EffectivePolicy = {
    visibility: 'private' | 'manager' | 'company';
    cadence: 'weekly' | 'biweekly' | 'monthly';
    timezone: string;
    anchorDow: number;
    anchorHour: number;
};
export declare class PolicyService {
    private readonly db;
    private readonly audit;
    private readonly cache;
    private readonly notification;
    private readonly emailQueue;
    constructor(db: db, audit: AuditService, cache: CacheService, notification: GoalNotificationService, emailQueue: Queue);
    private tags;
    private invalidate;
    getOrCreateCompanyPolicy(companyId: string): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        defaultVisibility: "private" | "manager" | "company";
        defaultCadence: "weekly" | "biweekly" | "monthly";
        defaultTimezone: string | null;
        defaultAnchorDow: number | null;
        defaultAnchorHour: number | null;
    }>;
    upsertCompanyPolicy(companyId: string, userId: string, dto: {
        defaultVisibility?: 'private' | 'manager' | 'company';
        defaultCadence?: 'weekly' | 'biweekly' | 'monthly';
        defaultTimezone?: string;
        defaultAnchorDow?: number;
        defaultAnchorHour?: number;
    }): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        defaultVisibility: "private" | "manager" | "company";
        defaultCadence: "weekly" | "biweekly" | "monthly";
        defaultTimezone: string | null;
        defaultAnchorDow: number | null;
        defaultAnchorHour: number | null;
    }>;
    getEffectivePolicy(companyId: string): Promise<EffectivePolicy>;
    upsertGoalScheduleFromPolicy(goalId: string, companyId: string, tx?: any, overrides?: Partial<Pick<EffectivePolicy, 'cadence' | 'timezone' | 'anchorDow' | 'anchorHour'>>): Promise<any>;
    private validate;
    private computeNextDueAt;
    processDueGoalCheckins(opts?: {
        companyId?: string;
        limit?: number;
    }): Promise<{
        processed: number;
        enqueued: number;
        skipped: number;
        advanced: number;
    }>;
    private rollForward;
}
