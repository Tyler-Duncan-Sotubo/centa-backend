import { User } from 'src/common/types/user.type';
import { PolicyService } from './goal-policy.service';
import { UpsertCompanyPolicyDto, UpsertTeamPolicyDto } from './dto/policy.dtos';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PerformancePolicyController extends BaseController {
    private readonly policy;
    constructor(policy: PolicyService);
    getEffective(user: User, groupId?: string): Promise<import("./goal-policy.service").EffectivePolicy>;
    upsertCompany(user: User, dto: UpsertCompanyPolicyDto): Promise<{
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
    upsertTeam(groupId: string, user: User, dto: UpsertTeamPolicyDto): Promise<{
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
    resyncObjectiveSchedule(objectiveId: string, user: User, overrides?: Partial<{
        cadence: 'weekly' | 'biweekly' | 'monthly';
        timezone: string;
        anchorDow: number;
        anchorHour: number;
        groupId: string | null;
    }>): Promise<{
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
}
