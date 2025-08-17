import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { UpsertCompanyPolicyDto, UpsertTeamPolicyDto } from './dto/policy.dtos';
export type EffectivePolicy = {
    visibility: 'private' | 'manager' | 'company';
    cadence: 'weekly' | 'biweekly' | 'monthly';
    timezone: string | null;
    anchorDow: number;
    anchorHour: number;
    defaultOwnerIsLead: boolean;
    _source?: {
        visibility: 'system' | 'company' | 'team';
        cadence: 'system' | 'company' | 'team';
        timezone: 'system' | 'company' | 'team' | 'none';
        anchorDow: 'system' | 'company' | 'team';
        anchorHour: 'system' | 'company' | 'team';
        defaultOwnerIsLead: 'system' | 'team';
    };
};
export declare class PolicyService {
    private readonly db;
    private readonly audit;
    constructor(db: db, audit: AuditService);
    getOrCreateCompanyPolicy(companyId: string): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        defaultVisibility: "manager" | "private" | "company";
        defaultCadence: "monthly" | "weekly" | "biweekly";
        defaultTimezone: string | null;
        defaultAnchorDow: number | null;
        defaultAnchorHour: number | null;
    }>;
    upsertCompanyPolicy(companyId: string, userId: string, dto: UpsertCompanyPolicyDto): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        defaultVisibility: "manager" | "private" | "company";
        defaultCadence: "monthly" | "weekly" | "biweekly";
        defaultTimezone: string | null;
        defaultAnchorDow: number | null;
        defaultAnchorHour: number | null;
    }>;
    upsertTeamPolicy(companyId: string, groupId: string, userId: string, dto: UpsertTeamPolicyDto): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        timezone: string | null;
        groupId: string;
        visibility: "manager" | "private" | "company" | null;
        cadence: "monthly" | "weekly" | "biweekly" | null;
        defaultOwnerIsLead: boolean | null;
        anchorDow: number | null;
        anchorHour: number | null;
    }>;
    getEffectivePolicy(companyId: string, groupId?: string | null): Promise<EffectivePolicy>;
    upsertObjectiveScheduleFromPolicy(objectiveId: string, companyId: string, groupId?: string | null, overrides?: Partial<Pick<EffectivePolicy, 'cadence' | 'timezone' | 'anchorDow' | 'anchorHour'>>): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        timezone: string | null;
        objectiveId: string | null;
        keyResultId: string | null;
        anchorDow: number | null;
        anchorHour: number | null;
        frequency: "monthly" | "weekly" | "biweekly";
        nextDueAt: Date;
    }>;
    resolveOwnerFromTeamLead(groupId?: string | null): Promise<string | null>;
    private validatePolicyPatch;
    private assertBounds;
    private computeNextDueAt;
}
