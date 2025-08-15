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
    tags(companyId) {
        return [
            `company:${companyId}:settings`,
            `company:${companyId}:settings:group:leave`,
        ];
    }
    async getAllLeaveSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'all'], async () => {
            const settings = await this.companySettingsService.getAllSettings(companyId);
            const leaveSettings = {};
            for (const setting of settings) {
                if (setting.key.startsWith('leave.')) {
                    const strippedKey = setting.key.replace('leave.', '');
                    leaveSettings[strippedKey] = setting.value;
                }
            }
            return leaveSettings;
        }, { tags: this.tags(companyId) });
    }
    async getSettingOrDefault(companyId, key, defaultValue) {
        const setting = await this.companySettingsService.getSetting(companyId, `leave.${key}`);
        return setting === undefined || setting === null
            ? defaultValue
            : setting;
    }
    async getApproverSetting(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'approver'], async () => {
            const approver = await this.getSettingOrDefault(companyId, 'approver', 'manager');
            const validApprovers = ['manager', 'hr', 'ceo', 'custom'];
            if (!validApprovers.includes(approver)) {
                throw new common_1.BadRequestException(`Invalid leave approver setting: ${approver}`);
            }
            return approver;
        }, { tags: this.tags(companyId) });
    }
    async isMultiLevelApproval(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'multi_level_approval'], () => this.getSettingOrDefault(companyId, 'multi_level_approval', false), { tags: this.tags(companyId) });
    }
    async getApprovalChain(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'approver_chain'], async () => {
            const chain = await this.getSettingOrDefault(companyId, 'approver_chain', ['line_manager', 'hr_manager']);
            if (!Array.isArray(chain) || chain.length === 0) {
                throw new common_1.BadRequestException('Approval chain must be a non-empty array.');
            }
            return chain;
        }, { tags: this.tags(companyId) });
    }
    async getAutoApproveAfterDays(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'auto_approve_after_days'], async () => {
            const days = await this.getSettingOrDefault(companyId, 'auto_approve_after_days', 7);
            if (days < 0) {
                throw new common_1.BadRequestException('Auto-approve days must be >= 0.');
            }
            return days;
        }, { tags: this.tags(companyId) });
    }
    async allowNegativeBalance(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'allow_negative_balance'], () => this.getSettingOrDefault(companyId, 'allow_negative_balance', false), { tags: this.tags(companyId) });
    }
    async allowUnconfirmedLeave(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'allow_unconfirmed_leave'], () => this.getSettingOrDefault(companyId, 'allow_unconfirmed_leave', false), { tags: this.tags(companyId) });
    }
    async allowedLeaveTypesForUnconfirmed(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'allowed_leave_types_for_unconfirmed'], async () => {
            const allowed = await this.getSettingOrDefault(companyId, 'allowed_leave_types_for_unconfirmed', []);
            if (!Array.isArray(allowed)) {
                throw new common_1.BadRequestException('Allowed leave types for unconfirmed employees must be an array.');
            }
            return allowed;
        }, { tags: this.tags(companyId) });
    }
    async excludeWeekends(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'exclude_weekends'], () => this.getSettingOrDefault(companyId, 'exclude_weekends', true), { tags: this.tags(companyId) });
    }
    async getWeekendDays(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'weekend_days'], () => this.getSettingOrDefault(companyId, 'weekend_days', [
            'Saturday',
            'Sunday',
        ]), { tags: this.tags(companyId) });
    }
    async excludePublicHolidays(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'exclude_public_holidays'], () => this.getSettingOrDefault(companyId, 'exclude_public_holidays', true), { tags: this.tags(companyId) });
    }
    async getBlockedDays(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'blocked_days'], () => this.getSettingOrDefault(companyId, 'blocked_days', []), { tags: this.tags(companyId) });
    }
    async getNotificationTargets(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'notifications'], async () => {
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
        }, { tags: this.tags(companyId) });
    }
    async getLeaveApprovalSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'approval'], async () => {
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
        }, { tags: this.tags(companyId) });
    }
    async getLeaveEntitlementSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'entitlement'], async () => {
            const keys = [
                'leave.default_annual_entitlement',
                'leave.allow_carryover',
                'leave.carryover_limit',
                'leave.allow_negative_balance',
            ];
            const rows = await this.companySettingsService.fetchSettings(companyId, keys);
            return {
                defaultAnnualEntitlement: Number(rows['leave.default_annual_entitlement'] ?? 0),
                allowCarryover: Boolean(rows['leave.allow_carryover']),
                carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
                allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
            };
        }, { tags: this.tags(companyId) });
    }
    async getLeaveEligibilitySettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'eligibility'], async () => {
            const keys = [
                'leave.allow_unconfirmed_leave',
                'leave.allowed_leave_types_for_unconfirmed',
                'leave.exclude_weekends',
                'leave.weekend_days',
                'leave.exclude_public_holidays',
                'leave.blocked_days',
            ];
            const rows = await this.companySettingsService.fetchSettings(companyId, keys);
            return {
                allowUnconfirmedLeave: Boolean(rows['leave.allow_unconfirmed_leave']),
                allowedLeaveTypesForUnconfirmed: rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
                excludeWeekends: Boolean(rows['leave.exclude_weekends']),
                weekendDays: rows['leave.weekend_days'] ?? [],
                excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
                blockedDays: rows['leave.blocked_days'] ?? [],
            };
        }, { tags: this.tags(companyId) });
    }
    async getLeaveNotificationSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'notification_settings'], async () => {
            const rows = await this.companySettingsService.fetchSettings(companyId, ['leave.notifications']);
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
        }, { tags: this.tags(companyId) });
    }
    async updateLeaveSetting(companyId, key, value) {
        const settingKey = `leave.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
    async getMinNoticeDays(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'min_notice_days'], async () => {
            const days = await this.getSettingOrDefault(companyId, 'min_notice_days', 3);
            if (days < 0) {
                throw new common_1.BadRequestException('Minimum notice days must be >= 0.');
            }
            return days;
        }, { tags: this.tags(companyId) });
    }
    async getMaxConsecutiveLeaveDays(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'max_consecutive_days'], async () => {
            const days = await this.getSettingOrDefault(companyId, 'max_consecutive_days', 30);
            if (days <= 0) {
                throw new common_1.BadRequestException('Max consecutive leave days must be > 0.');
            }
            return days;
        }, { tags: this.tags(companyId) });
    }
};
exports.LeaveSettingsService = LeaveSettingsService;
exports.LeaveSettingsService = LeaveSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], LeaveSettingsService);
//# sourceMappingURL=leave-settings.service.js.map