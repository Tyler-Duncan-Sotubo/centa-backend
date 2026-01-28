import { Injectable, BadRequestException } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class LeaveSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

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

  async isMultiLevelApproval(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'multi_level_approval', false);
  }

  async getApprovalChain(companyId: string): Promise<string[]> {
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
  }

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

  // ------------------------------
  // Policy toggles
  // ------------------------------
  async allowNegativeBalance(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'allow_negative_balance', false);
  }

  async allowUnconfirmedLeave(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(
      companyId,
      'allow_unconfirmed_leave',
      false,
    );
  }

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

  async excludeWeekends(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'exclude_weekends', true);
  }

  async getWeekendDays(companyId: string): Promise<string[]> {
    return this.getSettingOrDefault(companyId, 'weekend_days', [
      'Saturday',
      'Sunday',
    ]);
  }

  async excludePublicHolidays(companyId: string): Promise<boolean> {
    return this.getSettingOrDefault(companyId, 'exclude_public_holidays', true);
  }

  async getBlockedDays(companyId: string): Promise<string[]> {
    return this.getSettingOrDefault(companyId, 'blocked_days', []);
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
      throw new BadRequestException('Invalid notification settings structure.');
    }

    return targets;
  }

  // ------------------------------
  // Aggregates (cached)
  // ------------------------------
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
    return {
      defaultAnnualEntitlement: Number(
        rows['leave.default_annual_entitlement'] ?? 0,
      ),
      allowCarryover: Boolean(rows['leave.allow_carryover']),
      carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
      allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
    };
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
    return {
      allowUnconfirmedLeave: Boolean(rows['leave.allow_unconfirmed_leave']),
      allowedLeaveTypesForUnconfirmed:
        rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
      excludeWeekends: Boolean(rows['leave.exclude_weekends']),
      weekendDays: rows['leave.weekend_days'] ?? [],
      excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
      blockedDays: rows['leave.blocked_days'] ?? [],
    };
  }

  async getLeaveNotificationSettings(companyId: string) {
    const rows = await this.companySettingsService.fetchSettings(companyId, [
      'leave.notifications',
    ]);
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
}
