"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveSettingsService = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let LeaveSettingsService = class LeaveSettingsService {
    constructor(companySettingsService, cache) {
        this.companySettingsService = companySettingsService;
        this.cache = cache;
    }
    async getAllLeaveSettings(companyId) {
        const settings = await this.companySettingsService.getAllSettings(companyId);
        const leaveSettings = {};
        for (const setting of settings) {
            if (setting.key.startsWith('leave.')) {
                const strippedKey = setting.key.replace('leave.', '');
                leaveSettings[strippedKey] = setting.value;
            }
        }
        return leaveSettings;
    }
    async getSettingOrDefault(companyId, key, defaultValue) {
        const setting = await this.companySettingsService.getSetting(companyId, `leave.${key}`);
        if (setting === undefined || setting === null) {
            return defaultValue;
        }
        return setting;
    }
    async getApproverSetting(companyId) {
        const approver = await this.getSettingOrDefault(companyId, 'approver', 'manager');
        const validApprovers = ['manager', 'hr', 'ceo', 'custom'];
        if (!validApprovers.includes(approver)) {
            throw new common_1.BadRequestException(`Invalid leave approver setting: ${approver}`);
        }
        return approver;
    }
    async isMultiLevelApproval(companyId) {
        return this.getSettingOrDefault(companyId, 'multi_level_approval', false);
    }
    async getApprovalChain(companyId) {
        const chain = await this.getSettingOrDefault(companyId, 'approver_chain', [
            'line_manager',
            'hr_manager',
        ]);
        if (!Array.isArray(chain) || chain.length === 0) {
            throw new common_1.BadRequestException('Approval chain must be a non-empty array.');
        }
        return chain;
    }
    async getAutoApproveAfterDays(companyId) {
        const days = await this.getSettingOrDefault(companyId, 'auto_approve_after_days', 7);
        if (days < 0) {
            throw new common_1.BadRequestException('Auto-approve days must be >= 0.');
        }
        return days;
    }
    async allowNegativeBalance(companyId) {
        return this.getSettingOrDefault(companyId, 'allow_negative_balance', false);
    }
    async allowUnconfirmedLeave(companyId) {
        return this.getSettingOrDefault(companyId, 'allow_unconfirmed_leave', false);
    }
    async allowedLeaveTypesForUnconfirmed(companyId) {
        const allowed = await this.getSettingOrDefault(companyId, 'allowed_leave_types_for_unconfirmed', []);
        if (!Array.isArray(allowed)) {
            throw new common_1.BadRequestException('Allowed leave types for unconfirmed employees must be an array.');
        }
        return allowed;
    }
    async excludeWeekends(companyId) {
        return this.getSettingOrDefault(companyId, 'exclude_weekends', true);
    }
    async getWeekendDays(companyId) {
        return this.getSettingOrDefault(companyId, 'weekend_days', [
            'Saturday',
            'Sunday',
        ]);
    }
    async excludePublicHolidays(companyId) {
        return this.getSettingOrDefault(companyId, 'exclude_public_holidays', true);
    }
    async getBlockedDays(companyId) {
        return this.getSettingOrDefault(companyId, 'blocked_days', []);
    }
    async getNotificationTargets(companyId) {
        const defaultTargets = {
            notifyApprover: true,
            notifyHr: false,
            notifyLineManager: false,
            notifyEmployeeOnDecision: true,
            notificationCcRoles: [],
            notificationChannels: ['email'],
        };
        const targets = await this.getSettingOrDefault(companyId, 'notifications', defaultTargets);
        if (typeof targets !== 'object' ||
            !('notifyApprover' in targets) ||
            !('notifyEmployeeOnDecision' in targets)) {
            throw new common_1.BadRequestException('Invalid notification settings structure.');
        }
        return targets;
    }
    async getMinNoticeDays(companyId) {
        const days = await this.getSettingOrDefault(companyId, 'min_notice_days', 3);
        if (days < 0) {
            throw new common_1.BadRequestException('Minimum notice days must be >= 0.');
        }
        return days;
    }
    async getMaxConsecutiveLeaveDays(companyId) {
        const days = await this.getSettingOrDefault(companyId, 'max_consecutive_days', 30);
        if (days <= 0) {
            throw new common_1.BadRequestException('Max consecutive leave days must be > 0.');
        }
        return days;
    }
    async getLeaveApprovalSettings(companyId) {
        const keys = [
            'leave.approver',
            'leave.multi_level_approval',
            'leave.approver_chain',
            'leave.auto_approve_after_days',
        ];
        const rows = await this.companySettingsService.fetchSettings(companyId, keys);
        return {
            approver: rows['leave.approver'] ?? 'line_manager',
            multiLevelApproval: Boolean(rows['leave.multi_level_approval']),
            approverChain: rows['leave.approver_chain'] ?? [],
            autoApproveAfterDays: Number(rows['leave.auto_approve_after_days'] ?? 0),
        };
    }
    async getLeaveEntitlementSettings(companyId) {
        const keys = [
            'leave.default_annual_entitlement',
            'leave.allow_carryover',
            'leave.carryover_limit',
            'leave.allow_negative_balance',
        ];
        const rows = await this.companySettingsService.fetchSettings(companyId, keys);
        const cacheKey = `leave:entitlement:${companyId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return {
                defaultAnnualEntitlement: Number(rows['leave.default_annual_entitlement'] ?? 0),
                allowCarryover: Boolean(rows['leave.allow_carryover']),
                carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
                allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
            };
        });
    }
    async getLeaveEligibilitySettings(companyId) {
        const keys = [
            'leave.allow_unconfirmed_leave',
            'leave.allowed_leave_types_for_unconfirmed',
            'leave.exclude_weekends',
            'leave.weekend_days',
            'leave.exclude_public_holidays',
            'leave.blocked_days',
        ];
        const rows = await this.companySettingsService.fetchSettings(companyId, keys);
        const cacheKey = `leave:eligibility:${companyId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return {
                allowUnconfirmedLeave: Boolean(rows['leave.allow_unconfirmed_leave']),
                allowedLeaveTypesForUnconfirmed: rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
                excludeWeekends: Boolean(rows['leave.exclude_weekends']),
                weekendDays: rows['leave.weekend_days'] ?? [],
                excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
                blockedDays: rows['leave.blocked_days'] ?? [],
            };
        });
    }
    async getLeaveNotificationSettings(companyId) {
        const keys = ['leave.notifications'];
        const rows = await this.companySettingsService.fetchSettings(companyId, keys);
        const cacheKey = `leave:notifications:${companyId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return {
                notifications: rows['leave.notifications'] ?? {
                    notifyApprover: true,
                    notifyHr: false,
                    notifyLineManager: false,
                    notifyEmployeeOnDecision: true,
                    notificationCcRoles: [],
                    notificationChannels: ['email'],
                },
            };
        });
    }
    async updateLeaveSetting(companyId, key, value) {
        const settingKey = `leave.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
    getLeaveCacheKeyBySettingKey(key, companyId) {
        if ([
            'approver',
            'multi_level_approval',
            'approver_chain',
            'auto_approve_after_days',
        ].includes(key)) {
            return `leave:approval:${companyId}`;
        }
        if ([
            'default_annual_entitlement',
            'allow_carryover',
            'carryover_limit',
            'allow_negative_balance',
        ].includes(key)) {
            return `leave:entitlement:${companyId}`;
        }
        if ([
            'allow_unconfirmed_leave',
            'allowed_leave_types_for_unconfirmed',
            'exclude_weekends',
            'weekend_days',
            'exclude_public_holidays',
            'blocked_days',
        ].includes(key)) {
            return `leave:eligibility:${companyId}`;
        }
        if (key === 'notifications') {
            return `leave:notifications:${companyId}`;
        }
        return null;
    }
};
exports.LeaveSettingsService = LeaveSettingsService;
exports.LeaveSettingsService = LeaveSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], LeaveSettingsService);
//# sourceMappingURL=leave-settings.service.js.map