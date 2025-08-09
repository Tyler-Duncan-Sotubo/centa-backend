import { Injectable, BadRequestException } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LeaveSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(LeaveSettingsService.name);
  }

  // ---------- cache keys ----------
  private allKey(companyId: string) {
    return `leave:${companyId}:all`; // flattened leave.* map
  }
  private approvalKey(companyId: string) {
    return `leave:${companyId}:approval`;
  }
  private entitlementKey(companyId: string) {
    return `leave:${companyId}:entitlement`;
  }
  private eligibilityKey(companyId: string) {
    return `leave:${companyId}:eligibility`;
  }
  private notificationsKey(companyId: string) {
    return `leave:${companyId}:notifications`;
  }
  private singleKey(companyId: string, key: string) {
    return `leave:${companyId}:single:${key}`; // for getSettingOrDefault
  }
  private async burst(opts: { companyId: string; key?: string }) {
    const jobs: Promise<any>[] = [
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

  // ---------- helpers ----------
  private normalizeSettingKey(key: string) {
    return key.startsWith('leave.') ? key : `leave.${key}`;
  }

  // ---------- getters ----------
  async getAllLeaveSettings(companyId: string): Promise<Record<string, any>> {
    const key = this.allKey(companyId);
    this.logger.debug({ key, companyId }, 'leave:getAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const settings =
        await this.companySettingsService.getAllSettings(companyId);
      const leaveSettings: Record<string, any> = {};
      for (const setting of settings) {
        if (setting.key.startsWith('leave.')) {
          const strippedKey = setting.key.replace('leave.', '');
          leaveSettings[strippedKey] = setting.value;
        }
      }
      this.logger.debug(
        { companyId, count: Object.keys(leaveSettings).length },
        'leave:getAll:db:done',
      );
      return leaveSettings;
    });
  }

  // Generic getter with fallback (cached per key)
  async getSettingOrDefault<T = any>(
    companyId: string,
    key: string,
    defaultValue: T,
  ): Promise<T> {
    const normalized = this.normalizeSettingKey(key);
    const cacheKey = this.singleKey(companyId, normalized);
    this.logger.debug(
      { companyId, key: normalized, cacheKey },
      'leave:get:cache:get',
    );

    return this.cache.getOrSetCache(cacheKey, async () => {
      const setting = await this.companySettingsService.getSetting(
        companyId,
        normalized,
      );
      const val =
        setting === undefined || setting === null
          ? defaultValue
          : (setting as T);
      this.logger.debug(
        {
          companyId,
          key: normalized,
          hit: setting !== undefined && setting !== null,
        },
        'leave:get:db:done',
      );
      return val;
    });
  }

  // Approver Setting (manager, hr, ceo, custom)
  async getApproverSetting(companyId: string) {
    const approver = await this.getSettingOrDefault(
      companyId,
      'approver',
      'manager',
    );
    const validApprovers = ['manager', 'hr', 'ceo', 'custom'];
    if (!validApprovers.includes(approver)) {
      this.logger.warn({ companyId, approver }, 'leave:approver:invalid');
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
    const chain = await this.getSettingOrDefault(companyId, 'approver_chain', [
      'line_manager',
      'hr_manager',
    ]);
    if (!Array.isArray(chain) || chain.length === 0) {
      this.logger.warn({ companyId, chain }, 'leave:approver_chain:invalid');
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
      this.logger.warn(
        { companyId, days },
        'leave:auto_approve_after_days:invalid',
      );
      throw new BadRequestException('Auto-approve days must be >= 0.');
    }
    return days;
  }

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
      this.logger.warn(
        { companyId, allowed },
        'leave:allowed_unconfirmed:invalid',
      );
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
      this.logger.warn({ companyId, targets }, 'leave:notifications:invalid');
      throw new BadRequestException('Invalid notification settings structure.');
    }

    return targets;
  }

  async getMinNoticeDays(companyId: string): Promise<number> {
    const days = await this.getSettingOrDefault<number>(
      companyId,
      'min_notice_days',
      3,
    );
    if (days < 0) {
      this.logger.warn({ companyId, days }, 'leave:min_notice_days:invalid');
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
      this.logger.warn(
        { companyId, days },
        'leave:max_consecutive_days:invalid',
      );
      throw new BadRequestException('Max consecutive leave days must be > 0.');
    }
    return days;
  }

  // ---------- grouped settings (cached) ----------
  async getLeaveApprovalSettings(companyId: string) {
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
        autoApproveAfterDays: Number(
          rows['leave.auto_approve_after_days'] ?? 0,
        ),
      };
      this.logger.debug({ companyId }, 'leave:approval:db:done');
      return payload;
    });
  }

  async getLeaveEntitlementSettings(companyId: string) {
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
        defaultAnnualEntitlement: Number(
          rows['leave.default_annual_entitlement'] ?? 0,
        ),
        allowCarryover: Boolean(rows['leave.allow_carryover']),
        carryoverLimit: Number(rows['leave.carryover_limit'] ?? 0),
        allowNegativeBalance: Boolean(rows['leave.allow_negative_balance']),
      };
      this.logger.debug({ companyId }, 'leave:entitlement:db:done');
      return payload;
    });
  }

  async getLeaveEligibilitySettings(companyId: string) {
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
        allowedLeaveTypesForUnconfirmed:
          rows['leave.allowed_leave_types_for_unconfirmed'] ?? [],
        excludeWeekends: Boolean(rows['leave.exclude_weekends']),
        weekendDays: rows['leave.weekend_days'] ?? [],
        excludePublicHolidays: Boolean(rows['leave.exclude_public_holidays']),
        blockedDays: rows['leave.blocked_days'] ?? [],
      };
      this.logger.debug({ companyId }, 'leave:eligibility:db:done');
      return payload;
    });
  }

  async getLeaveNotificationSettings(companyId: string) {
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

  // ---------- update (with cache-bust) ----------
  async updateLeaveSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = this.normalizeSettingKey(key);
    this.logger.info(
      { companyId, key: settingKey },
      'leave:updateSetting:start',
    );

    await this.companySettingsService.setSetting(companyId, settingKey, value);

    await this.burst({ companyId, key: settingKey });
    this.logger.info(
      { companyId, key: settingKey },
      'leave:updateSetting:done',
    );
  }

  // Map a short key to a group cache for external callers that only know the raw key
  private getLeaveCacheKeyBySettingKey(
    key: string,
    companyId: string,
  ): string | null {
    const short = key.replace('leave.', '');
    if (
      [
        'approver',
        'multi_level_approval',
        'approver_chain',
        'auto_approve_after_days',
      ].includes(short)
    ) {
      return this.approvalKey(companyId);
    }
    if (
      [
        'default_annual_entitlement',
        'allow_carryover',
        'carryover_limit',
        'allow_negative_balance',
      ].includes(short)
    ) {
      return this.entitlementKey(companyId);
    }
    if (
      [
        'allow_unconfirmed_leave',
        'allowed_leave_types_for_unconfirmed',
        'exclude_weekends',
        'weekend_days',
        'exclude_public_holidays',
        'blocked_days',
      ].includes(short)
    ) {
      return this.eligibilityKey(companyId);
    }
    if (short === 'notifications') return this.notificationsKey(companyId);
    return null;
  }
}
