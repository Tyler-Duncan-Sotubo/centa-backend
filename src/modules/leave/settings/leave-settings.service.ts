import { Injectable, BadRequestException } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class LeaveSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 60; // tune as needed

  private tags(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:leave`,
    ];
  }

  // ------------------------------
  // Bulk read (cached)
  // ------------------------------
  async getAllLeaveSettings(companyId: string): Promise<Record<string, any>> {
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['leave', 'all'],
      async () => {
        const settings =
          await this.companySettingsService.getAllSettings(companyId);
        const leaveSettings: Record<string, any> = {};
        for (const setting of settings) {
          if (setting.key.startsWith('leave.')) {
            const strippedKey = setting.key.replace('leave.', '');
            leaveSettings[strippedKey] = setting.value;
          }
        }
        return leaveSettings;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  // ------------------------------
  // Generic getter (leverages the cached CompanySettingsService.getSetting)
  // ------------------------------
  async getSettingOrDefault<T = any>(
    companyId: string,
    key: string,
    defaultValue: T,
  ): Promise<T> {
    const setting = await this.companySettingsService.getSetting(
      companyId,
      `leave.${key}`,
    );
    return setting === undefined || setting === null
      ? defaultValue
      : (setting as T);
  }

  // ------------------------------
  // Approver config
  // ------------------------------
  async getApproverSetting(companyId: string) {
    return this.cache.getOrSetVersioned<string>(
      companyId,
      ['leave', 'approver'],
      async () => {
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async isMultiLevelApproval(companyId: string): Promise<boolean> {
    return this.cache.getOrSetVersioned<boolean>(
      companyId,
      ['leave', 'multi_level_approval'],
      () => this.getSettingOrDefault(companyId, 'multi_level_approval', false),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getApprovalChain(companyId: string): Promise<string[]> {
    return this.cache.getOrSetVersioned<string[]>(
      companyId,
      ['leave', 'approver_chain'],
      async () => {
        const chain = await this.getSettingOrDefault<string[]>(
          companyId,
          'approver_chain',
          ['line_manager', 'hr_manager'],
        );
        if (!Array.isArray(chain) || chain.length === 0) {
          throw new BadRequestException(
            'Approval chain must be a non-empty array.',
          );
        }
        return chain;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getAutoApproveAfterDays(companyId: string): Promise<number> {
    return this.cache.getOrSetVersioned<number>(
      companyId,
      ['leave', 'auto_approve_after_days'],
      async () => {
        const days = await this.getSettingOrDefault<number>(
          companyId,
          'auto_approve_after_days',
          7,
        );
        if (days < 0) {
          throw new BadRequestException('Auto-approve days must be >= 0.');
        }
        return days;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  // ------------------------------
  // Policy toggles
  // ------------------------------
  async allowNegativeBalance(companyId: string): Promise<boolean> {
    return this.cache.getOrSetVersioned<boolean>(
      companyId,
      ['leave', 'allow_negative_balance'],
      () =>
        this.getSettingOrDefault(companyId, 'allow_negative_balance', false),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async allowUnconfirmedLeave(companyId: string): Promise<boolean> {
    return this.cache.getOrSetVersioned<boolean>(
      companyId,
      ['leave', 'allow_unconfirmed_leave'],
      () =>
        this.getSettingOrDefault(companyId, 'allow_unconfirmed_leave', false),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async allowedLeaveTypesForUnconfirmed(companyId: string): Promise<string[]> {
    return this.cache.getOrSetVersioned<string[]>(
      companyId,
      ['leave', 'allowed_leave_types_for_unconfirmed'],
      async () => {
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async excludeWeekends(companyId: string): Promise<boolean> {
    return this.cache.getOrSetVersioned<boolean>(
      companyId,
      ['leave', 'exclude_weekends'],
      () => this.getSettingOrDefault(companyId, 'exclude_weekends', true),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getWeekendDays(companyId: string): Promise<string[]> {
    return this.cache.getOrSetVersioned<string[]>(
      companyId,
      ['leave', 'weekend_days'],
      () =>
        this.getSettingOrDefault(companyId, 'weekend_days', [
          'Saturday',
          'Sunday',
        ]),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async excludePublicHolidays(companyId: string): Promise<boolean> {
    return this.cache.getOrSetVersioned<boolean>(
      companyId,
      ['leave', 'exclude_public_holidays'],
      () =>
        this.getSettingOrDefault(companyId, 'exclude_public_holidays', true),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getBlockedDays(companyId: string): Promise<string[]> {
    return this.cache.getOrSetVersioned<string[]>(
      companyId,
      ['leave', 'blocked_days'],
      () => this.getSettingOrDefault(companyId, 'blocked_days', []),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  // ------------------------------
  // Notification rules
  // ------------------------------
  async getNotificationTargets(companyId: string): Promise<{
    notifyApprover: boolean;
    notifyHr: boolean;
    notifyLineManager: boolean;
    notifyEmployeeOnDecision: boolean;
    notificationCcRoles: string[];
    notificationChannels: string[];
  }> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'notifications'],
      async () => {
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

        if (
          typeof targets !== 'object' ||
          !('notifyApprover' in targets) ||
          !('notifyEmployeeOnDecision' in targets)
        ) {
          throw new BadRequestException(
            'Invalid notification settings structure.',
          );
        }

        return targets;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  // ------------------------------
  // Aggregates (cached)
  // ------------------------------
  async getLeaveApprovalSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'approval'],
      async () => {
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
          autoApproveAfterDays: Number(
            rows['leave.auto_approve_after_days'] ?? 0,
          ),
        };
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getLeaveEntitlementSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'entitlement'],
      async () => {
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
        return {
          defaultAnnualEntitlement: Number(
            rows['leave.default_annual_entitlement'] ?? 0,
          ),
          allowCarryover: Boolean(rows['leave.allow_carryover']),
          carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
          allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
        };
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getLeaveEligibilitySettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'eligibility'],
      async () => {
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
        return {
          allowUnconfirmedLeave: Boolean(rows['leave.allow_unconfirmed_leave']),
          allowedLeaveTypesForUnconfirmed:
            rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
          excludeWeekends: Boolean(rows['leave.exclude_weekends']),
          weekendDays: rows['leave.weekend_days'] ?? [],
          excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
          blockedDays: rows['leave.blocked_days'] ?? [],
        };
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getLeaveNotificationSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'notification_settings'],
      async () => {
        const rows = await this.companySettingsService.fetchSettings(
          companyId,
          ['leave.notifications'],
        );
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  // ------------------------------
  // Write (version bump handled upstream)
  // ------------------------------
  async updateLeaveSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `leave.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
    // No manual invalidation: version bump in CompanySettingsService makes old cache keys irrelevant.
  }

  // Inside LeaveSettingsService

  async getMinNoticeDays(companyId: string): Promise<number> {
    return this.cache.getOrSetVersioned<number>(
      companyId,
      ['leave', 'min_notice_days'],
      async () => {
        const days = await this.getSettingOrDefault<number>(
          companyId,
          'min_notice_days',
          3,
        );
        if (days < 0) {
          throw new BadRequestException('Minimum notice days must be >= 0.');
        }
        return days;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getMaxConsecutiveLeaveDays(companyId: string): Promise<number> {
    return this.cache.getOrSetVersioned<number>(
      companyId,
      ['leave', 'max_consecutive_days'],
      async () => {
        const days = await this.getSettingOrDefault<number>(
          companyId,
          'max_consecutive_days',
          30,
        );
        if (days <= 0) {
          throw new BadRequestException(
            'Max consecutive leave days must be > 0.',
          );
        }
        return days;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }
}
