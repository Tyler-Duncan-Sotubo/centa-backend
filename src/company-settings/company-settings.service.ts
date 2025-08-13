// src/company-settings/company-settings.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { companySettings } from './schema/index.schema';
import { eq, and, like, sql, inArray } from 'drizzle-orm';
import { attendance } from './settings/attendance';
import { leave } from './settings/leave';
import { payroll } from './settings/payroll';
import { expenses } from './settings/expense';
import { performance } from './settings/performance';
import { onboarding } from './settings/onboarding';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CompanySettingsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
  ) {}

  private settings = [
    ...attendance,
    ...leave,
    ...payroll,
    ...expenses,
    ...performance,
    ...onboarding,
    { key: 'default_currency', value: 'USD' },
    { key: 'default_timezone', value: 'UTC' },
    { key: 'default_language', value: 'en' },
    { key: 'default_manager_id', value: 'UUID-of-super-admin-or-lead' },
    { key: 'two_factor_auth', value: true },
  ];

  // -----------------------------
  // Helpers for cache key/tagging
  // -----------------------------
  private tagCompany(companyId: string) {
    return [`company:${companyId}:settings`];
  }
  private tagGroup(companyId: string, group: string) {
    return [`company:${companyId}:settings:group:${group}`];
  }
  private ttlSeconds = 60 * 60; // 1h cache for reads (tune as needed)

  // ---------------------------------
  // Single setting (read w/ cache)
  // ---------------------------------
  async getSetting(companyId: string, key: string): Promise<any | null> {
    return this.cache.getOrSetVersioned<any>(
      companyId,
      ['settings', 'get', key],
      async () => {
        const setting = await this.db
          .select()
          .from(companySettings)
          .where(
            and(
              eq(companySettings.companyId, companyId),
              eq(companySettings.key, key),
            ),
          );
        return setting[0] ? setting[0].value : null;
      },
      {
        ttlSeconds: this.ttlSeconds,
        tags: [
          ...this.tagCompany(companyId),
          ...this.tagGroup(companyId, key.split('.')[0] ?? 'root'),
        ],
      },
    );
  }

  // ---------------------------------
  // All settings (read w/ cache)
  // ---------------------------------
  async getAllSettings(companyId: string) {
    return this.cache.getOrSetVersioned<any[]>(
      companyId,
      ['settings', 'all'],
      async () => {
        return this.db
          .select()
          .from(companySettings)
          .where(eq(companySettings.companyId, companyId))
          .execute();
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tagCompany(companyId) },
    );
  }

  // ---------------------------------
  // Read w/ default (cached via getSetting)
  // ---------------------------------
  async getSettingsOrDefaults(
    companyId: string,
    key: string,
    defaultValue: any,
  ): Promise<any> {
    const value = await this.getSetting(companyId, key);
    return value === null || value === undefined ? defaultValue : value;
  }

  // ---------------------------------
  // Write operations -> bump version
  // ---------------------------------
  async setSetting(companyId: string, key: string, value: any): Promise<void> {
    const existing = await this.db
      .select({ id: companySettings.id })
      .from(companySettings)
      .where(
        and(
          eq(companySettings.companyId, companyId),
          eq(companySettings.key, key),
        ),
      )
      .execute();

    const settingExists = existing.length > 0;

    if (settingExists) {
      await this.db
        .update(companySettings)
        .set({ value })
        .where(
          and(
            eq(companySettings.companyId, companyId),
            eq(companySettings.key, key),
          ),
        );
    } else {
      await this.db.insert(companySettings).values({
        companyId,
        key,
        value,
      });
    }

    // Invalidate by version bump (atomic when Redis native client is present)
    await this.cache.bumpCompanyVersion(companyId);
  }

  // Get all settings that belong to a certain group (e.g., leave.*)
  async getSettingsByGroup(companyId: string, prefix: string): Promise<any[]> {
    return this.cache.getOrSetVersioned<any[]>(
      companyId,
      ['settings', 'group', prefix],
      async () => {
        const rows = await this.db
          .select()
          .from(companySettings)
          .where(
            and(
              eq(companySettings.companyId, companyId),
              like(companySettings.key, `${prefix}.%`),
            ),
          );

        const settings: { key: string; value: unknown }[] = [];
        for (const row of rows) {
          settings.push({
            key: row.key.replace(`${prefix}.`, ''),
            value: row.value,
          });
        }
        return settings;
      },
      {
        ttlSeconds: this.ttlSeconds,
        tags: [
          ...this.tagCompany(companyId),
          ...this.tagGroup(companyId, prefix),
        ],
      },
    );
  }

  async setSettings(companyId: string): Promise<void> {
    if (!this.settings.length) return;

    await this.db
      .insert(companySettings)
      .values(
        this.settings.map((setting) => ({
          companyId,
          key: setting.key,
          value: setting.value,
        })),
      )
      .onConflictDoUpdate({
        target: [companySettings.companyId, companySettings.key],
        set: { value: sql`EXCLUDED.value` },
      });

    await this.cache.bumpCompanyVersion(companyId);
  }

  // Delete a setting
  async deleteSetting(companyId: string, key: string): Promise<void> {
    await this.db
      .delete(companySettings)
      .where(
        and(
          eq(companySettings.companyId, companyId),
          eq(companySettings.key, key),
        ),
      );

    await this.cache.bumpCompanyVersion(companyId);
  }

  // -------------------------
  // Flags & grouped configs
  // -------------------------
  async getDefaultManager(companyId: string) {
    const keys = ['default_manager_id'];

    const map = await this.fetchSettings(companyId, keys);
    return {
      defaultManager: (map['default_manager_id'] as string) || '',
    };
  }

  async getPayrollConfig(companyId: string) {
    const keys = [
      'payroll.apply_paye',
      'payroll.apply_nhf',
      'payroll.apply_pension',
      'payroll.apply_nhis',
      'payroll.apply_nsitf',
      'payroll.basic_percent',
      'payroll.housing_percent',
      'payroll.transport_percent',
      'payroll.allowance_others',
    ];

    const map = await this.fetchSettings(companyId, keys);
    return {
      applyPaye: Boolean(map['payroll.apply_paye']),
      applyNhf: Boolean(map['payroll.apply_nhf']),
      applyPension: Boolean(map['payroll.apply_pension']),
      applyNhis: Boolean(map['payroll.apply_nhis']),
      applyNsitf: Boolean(map['payroll.apply_nsitf']),
    };
  }

  async getAllowanceConfig(companyId: string) {
    const keys = [
      'payroll.basic_percent',
      'payroll.housing_percent',
      'payroll.transport_percent',
      'payroll.allowance_others',
    ];

    const map = await this.fetchSettings(companyId, keys);
    return {
      basicPercent: Number(map['payroll.basic_percent'] ?? 0),
      housingPercent: Number(map['payroll.housing_percent'] ?? 0),
      transportPercent: Number(map['payroll.transport_percent'] ?? 0),
      allowanceOthers:
        (map['payroll.allowance_others'] as Array<{
          type: string;
          percentage?: number;
          fixedAmount?: number;
        }>) || [],
    };
  }

  async getApprovalAndProrationSettings(companyId: string) {
    const keys = [
      'payroll.multi_level_approval',
      'payroll.approver_chain',
      'payroll.approval_fallback',
      'payroll.approver',
      'payroll.enable_proration',
    ];

    const map = await this.fetchSettings(companyId, keys);
    return {
      multiLevelApproval: Boolean(map['payroll.multi_level_approval']),
      approverChain: (map['payroll.approver_chain'] as string[]) || [],
      approvalFallback: (map['payroll.approval_fallback'] as string[]) || [],
      approver: map['payroll.approver'] ?? null,
      enableProration: Boolean(map['payroll.enable_proration']),
    };
  }

  async getThirteenthMonthSettings(companyId: string) {
    const keys = [
      'payroll.enable_13th_month',
      'payroll.13th_month_payment_date',
      'payroll.13th_month_payment_amount',
      'payroll.13th_month_payment_type',
      'payroll.13th_month_payment_percentage',
    ];

    const map = await this.fetchSettings(companyId, keys);
    return {
      enable13thMonth: Boolean(map['payroll.enable_13th_month']),
      paymentDate: map['payroll.13th_month_payment_date'],
      paymentAmount: Number(map['payroll.13th_month_payment_amount'] ?? 0),
      paymentType: map['payroll.13th_month_payment_type'] ?? 'fixed',
      paymentPercentage: Number(
        map['payroll.13th_month_payment_percentage'] ?? 0,
      ),
    };
  }

  async getLoanSettings(companyId: string) {
    const keys = [
      'payroll.use_loan',
      'payroll.loan_max_percent',
      'payroll.loan_min_amount',
      'payroll.loan_max_amount',
    ];

    const map = await this.fetchSettings(companyId, keys);
    return {
      useLoan: Boolean(map['payroll.use_loan']),
      maxPercentOfSalary: Number(map['payroll.loan_max_percent'] ?? 1),
      minAmount: Number(map['payroll.loan_min_amount'] ?? 0),
      maxAmount: Number(map['payroll.loan_max_amount'] ?? Infinity),
    };
  }

  /**
   * Fetch a subset of keys in one go, cached under a stable composite key.
   */
  async fetchSettings(companyId: string, keys: string[]) {
    const sorted = [...keys].sort(); // ensure key is order-independent
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['settings', 'subset', sorted.join('|')],
      async () => {
        const rows = await this.db
          .select({ key: companySettings.key, value: companySettings.value })
          .from(companySettings)
          .where(
            and(
              eq(companySettings.companyId, companyId),
              inArray(companySettings.key, keys),
            ),
          )
          .execute();

        return rows.reduce<Record<string, any>>((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {});
      },
      {
        ttlSeconds: this.ttlSeconds,
        // tag each group represented in the subset so tag invalidation remains targeted
        tags: [
          ...this.tagCompany(companyId),
          ...Array.from(
            new Set(sorted.map((k) => k.split('.')[0] ?? 'root')),
          ).map((g) => `company:${companyId}:settings:group:${g}`),
        ],
      },
    );
  }

  async getTwoFactorAuthSetting(companyId: string) {
    const map = await this.fetchSettings(companyId, ['two_factor_auth']);
    return { twoFactorAuth: Boolean(map['two_factor_auth']) };
  }

  async getOnboardingSettings(companyId: string) {
    const keys = [
      'onboarding_pay_frequency',
      'onboarding_pay_group',
      'onboarding_tax_details',
      'onboarding_company_locations',
      'onboarding_departments',
      'onboarding_job_roles',
      'onboarding_cost_center',
      'onboarding_upload_employees',
    ];

    const map = await this.fetchSettings(companyId, keys);

    return {
      payFrequency: Boolean(map['onboarding_pay_frequency']),
      payGroup: Boolean(map['onboarding_pay_group']),
      taxDetails: Boolean(map['onboarding_tax_details']),
      companyLocations: Boolean(map['onboarding_company_locations']),
      departments: Boolean(map['onboarding_departments']),
      jobRoles: Boolean(map['onboarding_job_roles']),
      costCenter: Boolean(map['onboarding_cost_center']),
      uploadEmployees: Boolean(map['onboarding_upload_employees']),
    };
  }
}
