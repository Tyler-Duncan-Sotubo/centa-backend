import { Injectable, BadRequestException } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class LeaveSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  async getAllLeaveSettings(companyId: string): Promise<Record<string, any>> {
    const settings =
      await this.companySettingsService.getAllSettings(companyId);

    const leaveSettings = {};

    for (const setting of settings) {
      if (setting.key.startsWith('leave.')) {
        const strippedKey = setting.key.replace('leave.', '');
        leaveSettings[strippedKey] = setting.value;
      }
    }

    return leaveSettings;
  }

  // Generic getter with fallback
  async getSettingOrDefault<T = any>(
    companyId: string,
    key: string,
    defaultValue: T,
  ): Promise<T> {
    const setting = await this.companySettingsService.getSetting(
      companyId,
      `leave.${key}`,
    );
    if (setting === undefined || setting === null) {
      return defaultValue;
    }
    return setting;
  }

  // Approver Setting (line_manager, hr, ceo)
  async getApproverSetting(companyId: string) {
    const approver = await this.getSettingOrDefault(
      companyId,
      'approver',
      'manager',
    );

    const validApprovers = ['manager', 'hr', 'ceo', 'custom'];
    if (!validApprovers.includes(approver)) {
      throw new BadRequestException(
        `Invalid leave approver setting: ${approver}`,
      );
    }

    return approver;
  }

  // Is Multi-Level Approval enabled?
  async isMultiLevelApproval(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'multi_level_approval', false);
  }

  // Get Custom Approver Chain (if multi-level is enabled)
  async getApprovalChain(companyId: string): Promise<string[]> {
    const chain = await this.getSettingOrDefault(companyId, 'approver_chain', [
      'line_manager',
      'hr_manager',
    ]);

    if (!Array.isArray(chain) || chain.length === 0) {
      throw new BadRequestException(
        'Approval chain must be a non-empty array.',
      );
    }

    return chain;
  }

  // Auto-approve pending leave after N days?
  async getAutoApproveAfterDays(companyId: string): Promise<number> {
    const days = await this.getSettingOrDefault<number>(
      companyId,
      'auto_approve_after_days',
      7,
    );

    if (days < 0) {
      throw new BadRequestException('Auto-approve days must be >= 0.');
    }

    return days;
  }

  // should allow negative leave balance?
  async allowNegativeBalance(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'allow_negative_balance', false);
  }

  // Should unconfirmed employees be allowed to request leave?
  async allowUnconfirmedLeave(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(
      companyId,
      'allow_unconfirmed_leave',
      false,
    );
  }

  // What types of leave can unconfirmed employees request?
  async allowedLeaveTypesForUnconfirmed(companyId: string): Promise<string[]> {
    const allowed = await this.getSettingOrDefault<string[]>(
      companyId,
      'allowed_leave_types_for_unconfirmed',
      [],
    );

    if (!Array.isArray(allowed)) {
      throw new BadRequestException(
        'Allowed leave types for unconfirmed employees must be an array.',
      );
    }

    return allowed;
  }

  // Should weekends be excluded from leave count?
  async excludeWeekends(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'exclude_weekends', true);
  }

  // What days are considered weekends? (Saturday, Sunday by default)
  async getWeekendDays(companyId: string): Promise<string[]> {
    return this.getSettingOrDefault(companyId, 'weekend_days', [
      'Saturday',
      'Sunday',
    ]);
  }

  // Should public holidays be excluded from leave count?
  async excludePublicHolidays(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'exclude_public_holidays', true);
  }

  // Get globally blocked days (company-specific, no-leave days)
  async getBlockedDays(companyId: string): Promise<string[]> {
    return this.getSettingOrDefault(companyId, 'blocked_days', []);
  }

  // Notification Rules
  async getNotificationTargets(companyId: string): Promise<{
    notifyApprover: boolean;
    notifyHr: boolean;
    notifyLineManager: boolean;
    notifyEmployeeOnDecision: boolean;
    notificationCcRoles: string[];
    notificationChannels: string[];
  }> {
    const defaultTargets = {
      notifyApprover: true,
      notifyHr: false,
      notifyLineManager: false,
      notifyEmployeeOnDecision: true,
      notificationCcRoles: [],
      notificationChannels: ['email'],
    };

    const targets = await this.getSettingOrDefault(
      companyId,
      'notifications',
      defaultTargets,
    );

    // Validate structure
    if (
      typeof targets !== 'object' ||
      !('notifyApprover' in targets) ||
      !('notifyEmployeeOnDecision' in targets)
    ) {
      throw new BadRequestException('Invalid notification settings structure.');
    }

    return targets;
  }

  // Minimum notice period before leave start
  async getMinNoticeDays(companyId: string): Promise<number> {
    const days = await this.getSettingOrDefault<number>(
      companyId,
      'min_notice_days',
      3,
    );
    if (days < 0) {
      throw new BadRequestException('Minimum notice days must be >= 0.');
    }
    return days;
  }

  // Maximum consecutive leave allowed
  async getMaxConsecutiveLeaveDays(companyId: string): Promise<number> {
    const days = await this.getSettingOrDefault<number>(
      companyId,
      'max_consecutive_days',
      30,
    );
    if (days <= 0) {
      throw new BadRequestException('Max consecutive leave days must be > 0.');
    }
    return days;
  }

  // Get all leave settings --------------------------
  async getLeaveApprovalSettings(companyId: string) {
    const keys = [
      'leave.approver',
      'leave.multi_level_approval',
      'leave.approver_chain',
      'leave.auto_approve_after_days',
    ];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

    return {
      approver: rows['leave.approver'] ?? 'line_manager',
      multiLevelApproval: Boolean(rows['leave.multi_level_approval']),
      approverChain: rows['leave.approver_chain'] ?? [],
      autoApproveAfterDays: Number(rows['leave.auto_approve_after_days'] ?? 0),
    };
  }

  async getLeaveEntitlementSettings(companyId: string) {
    const keys = [
      'leave.default_annual_entitlement',
      'leave.allow_carryover',
      'leave.carryover_limit',
      'leave.allow_negative_balance',
    ];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

    const cacheKey = `leave:entitlement:${companyId}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      return {
        defaultAnnualEntitlement: Number(
          rows['leave.default_annual_entitlement'] ?? 0,
        ),
        allowCarryover: Boolean(rows['leave.allow_carryover']),
        carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
        allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
      };
    });
  }

  async getLeaveEligibilitySettings(companyId: string) {
    const keys = [
      'leave.allow_unconfirmed_leave',
      'leave.allowed_leave_types_for_unconfirmed',
      'leave.exclude_weekends',
      'leave.weekend_days',
      'leave.exclude_public_holidays',
      'leave.blocked_days',
    ];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

    const cacheKey = `leave:eligibility:${companyId}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      return {
        allowUnconfirmedLeave: Boolean(rows['leave.allow_unconfirmed_leave']),
        allowedLeaveTypesForUnconfirmed:
          rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
        excludeWeekends: Boolean(rows['leave.exclude_weekends']),
        weekendDays: rows['leave.weekend_days'] ?? [],
        excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
        blockedDays: rows['leave.blocked_days'] ?? [],
      };
    });
  }

  async getLeaveNotificationSettings(companyId: string) {
    const keys = ['leave.notifications'];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

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

  async updateLeaveSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `leave.${key}`;

    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }

  private getLeaveCacheKeyBySettingKey(
    key: string,
    companyId: string,
  ): string | null {
    if (
      [
        'approver',
        'multi_level_approval',
        'approver_chain',
        'auto_approve_after_days',
      ].includes(key)
    ) {
      return `leave:approval:${companyId}`;
    }

    if (
      [
        'default_annual_entitlement',
        'allow_carryover',
        'carryover_limit',
        'allow_negative_balance',
      ].includes(key)
    ) {
      return `leave:entitlement:${companyId}`;
    }

    if (
      [
        'allow_unconfirmed_leave',
        'allowed_leave_types_for_unconfirmed',
        'exclude_weekends',
        'weekend_days',
        'exclude_public_holidays',
        'blocked_days',
      ].includes(key)
    ) {
      return `leave:eligibility:${companyId}`;
    }

    if (key === 'notifications') {
      return `leave:notifications:${companyId}`;
    }

    return null;
  }
}
