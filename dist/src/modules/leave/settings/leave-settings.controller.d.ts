import { LeaveSettingsService } from './leave-settings.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class LeaveSettingsController extends BaseController {
    private readonly settingsService;
    constructor(settingsService: LeaveSettingsService);
    getLeaveApprovalSetting(user: User): Promise<{
        approver: any;
        multiLevelApproval: boolean;
        approverChain: any;
        autoApproveAfterDays: number;
    }>;
    getLeaveEntitlementSettings(user: User): Promise<{
        defaultAnnualEntitlement: number;
        allowCarryover: boolean;
        carryoverLimit: number;
        allowNegativeBalance: boolean;
    }>;
    getLeaveEligibilitySettings(user: User): Promise<{
        allowUnconfirmedLeave: boolean;
        allowedLeaveTypesForUnconfirmed: any;
        excludeWeekends: boolean;
        weekendDays: any;
        excludePublicHolidays: boolean;
        blockedDays: any;
    }>;
    getLeaveNotificationSettings(user: User): Promise<{
        notifications: any;
    }>;
    updateLeaveSetting(user: User, key: string, value: any): Promise<void>;
}
