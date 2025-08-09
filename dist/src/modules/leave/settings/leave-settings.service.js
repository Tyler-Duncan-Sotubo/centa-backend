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
var LeaveSettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveSettingsService = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const nestjs_pino_1 = require("nestjs-pino");
let LeaveSettingsService = LeaveSettingsService_1 = class LeaveSettingsService {
    constructor(companySettingsService, cache, logger) {
        this.companySettingsService = companySettingsService;
        this.cache = cache;
        this.logger = logger;
        this.logger.setContext(LeaveSettingsService_1.name);
    }
    allKey(companyId) {
        return `leave:${companyId}:all`;
    }
    approvalKey(companyId) {
        return `leave:${companyId}:approval`;
    }
    entitlementKey(companyId) {
        return `leave:${companyId}:entitlement`;
    }
    eligibilityKey(companyId) {
        return `leave:${companyId}:eligibility`;
    }
    notificationsKey(companyId) {
        return `leave:${companyId}:notifications`;
    }
    singleKey(companyId, key) {
        return `leave:${companyId}:single:${key}`;
    }
    async burst(opts) {
        const jobs = [
            this.cache.del(this.allKey(opts.companyId)),
            this.cache.del(this.approvalKey(opts.companyId)),
            this.cache.del(this.entitlementKey(opts.companyId)),
            this.cache.del(this.eligibilityKey(opts.companyId)),
            this.cache.del(this.notificationsKey(opts.companyId)),
        ];
        if (opts.key)
            jobs.push(this.cache.del(this.singleKey(opts.companyId, opts.key)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:leave-settings');
    }
    normalizeSettingKey(key) {
        return key.startsWith('leave.') ? key : `leave.${key}`;
    }
    async getAllLeaveSettings(companyId) {
        const key = this.allKey(companyId);
        this.logger.debug({ key, companyId }, 'leave:getAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const settings = await this.companySettingsService.getAllSettings(companyId);
            const leaveSettings = {};
            for (const setting of settings) {
                if (setting.key.startsWith('leave.')) {
                    const strippedKey = setting.key.replace('leave.', '');
                    leaveSettings[strippedKey] = setting.value;
                }
            }
            this.logger.debug({ companyId, count: Object.keys(leaveSettings).length }, 'leave:getAll:db:done');
            return leaveSettings;
        });
    }
    async getSettingOrDefault(companyId, key, defaultValue) {
        const normalized = this.normalizeSettingKey(key);
        const cacheKey = this.singleKey(companyId, normalized);
        this.logger.debug({ companyId, key: normalized, cacheKey }, 'leave:get:cache:get');
        return this.cache.getOrSetCache(cacheKey, async () => {
            const setting = await this.companySettingsService.getSetting(companyId, normalized);
            const val = setting === undefined || setting === null
                ? defaultValue
                : setting;
            this.logger.debug({
                companyId,
                key: normalized,
                hit: setting !== undefined && setting !== null,
            }, 'leave:get:db:done');
            return val;
        });
    }
    async getApproverSetting(companyId) {
        const approver = await this.getSettingOrDefault(companyId, 'approver', 'manager');
        const validApprovers = ['manager', 'hr', 'ceo', 'custom'];
        if (!validApprovers.includes(approver)) {
            this.logger.warn({ companyId, approver }, 'leave:approver:invalid');
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
            this.logger.warn({ companyId, chain }, 'leave:approver_chain:invalid');
            throw new common_1.BadRequestException('Approval chain must be a non-empty array.');
        }
        return chain;
    }
    async getAutoApproveAfterDays(companyId) {
        const days = await this.getSettingOrDefault(companyId, 'auto_approve_after_days', 7);
        if (days < 0) {
            this.logger.warn({ companyId, days }, 'leave:auto_approve_after_days:invalid');
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
            this.logger.warn({ companyId, allowed }, 'leave:allowed_unconfirmed:invalid');
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
            this.logger.warn({ companyId, targets }, 'leave:notifications:invalid');
            throw new common_1.BadRequestException('Invalid notification settings structure.');
        }
        return targets;
    }
    async getMinNoticeDays(companyId) {
        const days = await this.getSettingOrDefault(companyId, 'min_notice_days', 3);
        if (days < 0) {
            this.logger.warn({ companyId, days }, 'leave:min_notice_days:invalid');
            throw new common_1.BadRequestException('Minimum notice days must be >= 0.');
        }
        return days;
    }
    async getMaxConsecutiveLeaveDays(companyId) {
        const days = await this.getSettingOrDefault(companyId, 'max_consecutive_days', 30);
        if (days <= 0) {
            this.logger.warn({ companyId, days }, 'leave:max_consecutive_days:invalid');
            throw new common_1.BadRequestException('Max consecutive leave days must be > 0.');
        }
        return days;
    }
    async getLeaveApprovalSettings(companyId) {
        const key = this.approvalKey(companyId);
        this.logger.debug({ key, companyId }, 'leave:approval:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.companySettingsService.fetchSettings(companyId, [
                'leave.approver',
                'leave.multi_level_approval',
                'leave.approver_chain',
                'leave.auto_approve_after_days',
            ]);
            const payload = {
                approver: rows['leave.approver'] ?? 'line_manager',
                multiLevelApproval: Boolean(rows['leave.multi_level_approval']),
                approverChain: rows['leave.approver_chain'] ?? [],
                autoApproveAfterDays: Number(rows['leave.auto_approve_after_days'] ?? 0),
            };
            this.logger.debug({ companyId }, 'leave:approval:db:done');
            return payload;
        });
    }
    async getLeaveEntitlementSettings(companyId) {
        const key = this.entitlementKey(companyId);
        this.logger.debug({ key, companyId }, 'leave:entitlement:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.companySettingsService.fetchSettings(companyId, [
                'leave.default_annual_entitlement',
                'leave.allow_carryover',
                'leave.carryover_limit',
                'leave.allow_negative_balance',
            ]);
            const payload = {
                defaultAnnualEntitlement: Number(rows['leave.default_annual_entitlement'] ?? 0),
                allowCarryover: Boolean(rows['leave.allow_carryover']),
                carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
                allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
            };
            this.logger.debug({ companyId }, 'leave:entitlement:db:done');
            return payload;
        });
    }
    async getLeaveEligibilitySettings(companyId) {
        const key = this.eligibilityKey(companyId);
        this.logger.debug({ key, companyId }, 'leave:eligibility:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.companySettingsService.fetchSettings(companyId, [
                'leave.allow_unconfirmed_leave',
                'leave.allowed_leave_types_for_unconfirmed',
                'leave.exclude_weekends',
                'leave.weekend_days',
                'leave.exclude_public_holidays',
                'leave.blocked_days',
            ]);
            const payload = {
                allowUnconfirmedLeave: Boolean(rows['leave.allow_unconfirmed_leave']),
                allowedLeaveTypesForUnconfirmed: rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
                excludeWeekends: Boolean(rows['leave.exclude_weekends']),
                weekendDays: rows['leave.weekend_days'] ?? [],
                excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
                blockedDays: rows['leave.blocked_days'] ?? [],
            };
            this.logger.debug({ companyId }, 'leave:eligibility:db:done');
            return payload;
        });
    }
    async getLeaveNotificationSettings(companyId) {
        const key = this.notificationsKey(companyId);
        this.logger.debug({ key, companyId }, 'leave:notifications:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.companySettingsService.fetchSettings(companyId, [
                'leave.notifications',
            ]);
            const payload = {
                notifications: rows['leave.notifications'] ?? {
                    notifyApprover: true,
                    notifyHr: false,
                    notifyLineManager: false,
                    notifyEmployeeOnDecision: true,
                    notificationCcRoles: [],
                    notificationChannels: ['email'],
                },
            };
            this.logger.debug({ companyId }, 'leave:notifications:db:done');
            return payload;
        });
    }
    async updateLeaveSetting(companyId, key, value) {
        const settingKey = this.normalizeSettingKey(key);
        this.logger.info({ companyId, key: settingKey }, 'leave:updateSetting:start');
        await this.companySettingsService.setSetting(companyId, settingKey, value);
        await this.burst({ companyId, key: settingKey });
        this.logger.info({ companyId, key: settingKey }, 'leave:updateSetting:done');
    }
    getLeaveCacheKeyBySettingKey(key, companyId) {
        const short = key.replace('leave.', '');
        if ([
            'approver',
            'multi_level_approval',
            'approver_chain',
            'auto_approve_after_days',
        ].includes(short)) {
            return this.approvalKey(companyId);
        }
        if ([
            'default_annual_entitlement',
            'allow_carryover',
            'carryover_limit',
            'allow_negative_balance',
        ].includes(short)) {
            return this.entitlementKey(companyId);
        }
        if ([
            'allow_unconfirmed_leave',
            'allowed_leave_types_for_unconfirmed',
            'exclude_weekends',
            'weekend_days',
            'exclude_public_holidays',
            'blocked_days',
        ].includes(short)) {
            return this.eligibilityKey(companyId);
        }
        if (short === 'notifications')
            return this.notificationsKey(companyId);
        return null;
    }
};
exports.LeaveSettingsService = LeaveSettingsService;
exports.LeaveSettingsService = LeaveSettingsService = LeaveSettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService,
        nestjs_pino_1.PinoLogger])
], LeaveSettingsService);
//# sourceMappingURL=leave-settings.service.js.map