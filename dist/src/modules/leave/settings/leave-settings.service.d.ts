import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PinoLogger } from 'nestjs-pino';
export declare class LeaveSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    private readonly logger;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService, logger: PinoLogger);
    private allKey;
    private approvalKey;
    private entitlementKey;
    private eligibilityKey;
    private notificationsKey;
    private singleKey;
    private burst;
    private normalizeSettingKey;
    getAllLeaveSettings(companyId: string): Promise<Record<string, any>>;
    getSettingOrDefault<T = any>(companyId: string, key: string, defaultValue: T): Promise<T>;
    getApproverSetting(companyId: string): Promise<string>;
    isMultiLevelApproval(companyId: string): Promise<boolean>;
    getApprovalChain(companyId: string): Promise<string[]>;
    getAutoApproveAfterDays(companyId: string): Promise<number>;
    allowNegativeBalance(companyId: string): Promise<boolean>;
    allowUnconfirmedLeave(companyId: string): Promise<boolean>;
    allowedLeaveTypesForUnconfirmed(companyId: string): Promise<string[]>;
    excludeWeekends(companyId: string): Promise<boolean>;
    getWeekendDays(companyId: string): Promise<string[]>;
    excludePublicHolidays(companyId: string): Promise<boolean>;
    getBlockedDays(companyId: string): Promise<string[]>;
    getNotificationTargets(companyId: string): Promise<{
        notifyApprover: boolean;
        notifyHr: boolean;
        notifyLineManager: boolean;
        notifyEmployeeOnDecision: boolean;
        notificationCcRoles: string[];
        notificationChannels: string[];
    }>;
    getMinNoticeDays(companyId: string): Promise<number>;
    getMaxConsecutiveLeaveDays(companyId: string): Promise<number>;
    getLeaveApprovalSettings(companyId: string): Promise<{
        approver: any;
        multiLevelApproval: boolean;
        approverChain: any;
        autoApproveAfterDays: number;
    }>;
    getLeaveEntitlementSettings(companyId: string): Promise<{
        defaultAnnualEntitlement: number;
        allowCarryover: boolean;
        carryoverLimit: number;
        allowNegativeBalance: boolean;
    }>;
    getLeaveEligibilitySettings(companyId: string): Promise<{
        allowUnconfirmedLeave: boolean;
        allowedLeaveTypesForUnconfirmed: any;
        excludeWeekends: boolean;
        weekendDays: any;
        excludePublicHolidays: boolean;
        blockedDays: any;
    }>;
    getLeaveNotificationSettings(companyId: string): Promise<{
        notifications: any;
    }>;
    updateLeaveSetting(companyId: string, key: string, value: any): Promise<void>;
    private getLeaveCacheKeyBySettingKey;
}
