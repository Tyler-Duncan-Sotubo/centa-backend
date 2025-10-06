import { User } from 'src/common/types/user.type';
import { PolicyService } from './goal-policy.service';
import { UpsertCompanyPolicyDto } from './dto/policy.dtos';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PerformancePolicyController extends BaseController {
    private readonly policy;
    constructor(policy: PolicyService);
    getEffective(user: User): Promise<import("./goal-policy.service").EffectivePolicy>;
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
}
