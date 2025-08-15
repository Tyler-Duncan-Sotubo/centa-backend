import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class PayrollSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:payroll`,
    ];
  }

  /**
   * All payroll.* settings as a flat object (prefix stripped).
   * Cached under company:{id}:v{ver}:payroll:all
   */
  async getAllPayrollSettings(companyId: string): Promise<Record<string, any>> {
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['payroll', 'all'],
      async () => {
        const settings =
          await this.companySettingsService.getAllSettings(companyId);
        const payrollSettings: Record<string, any> = {};
        for (const setting of settings) {
          if (setting.key.startsWith('payroll.')) {
            const strippedKey = setting.key.replace('payroll.', '');
            payrollSettings[strippedKey] = setting.value;
          }
        }
        return payrollSettings;
      },
      { tags: this.tags(companyId) },
    );
  }

  /**
   * High-level payroll toggles (uses CompanySettingsService under the hood).
   * Cached under company:{id}:v{ver}:payroll:config
   */
  async payrollSettings(companyId: string): Promise<any> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payroll', 'config'],
      () => this.companySettingsService.getPayrollConfig(companyId),
      { tags: this.tags(companyId) },
    );
  }

  /**
   * Allowance breakdown percentages & custom allowances.
   * Cached under company:{id}:v{ver}:payroll:allowance
   */
  async allowanceSettings(companyId: string): Promise<any> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payroll', 'allowance'],
      () => this.companySettingsService.getAllowanceConfig(companyId),
      { tags: this.tags(companyId) },
    );
  }

  /**
   * Multi-level approval and proration config.
   * Cached under company:{id}:v{ver}:payroll:approval_proration
   */
  async getApprovalAndProrationSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payroll', 'approval_proration'],
      () =>
        this.companySettingsService.getApprovalAndProrationSettings(companyId),
      { tags: this.tags(companyId) },
    );
  }

  /**
   * 13th month payment configuration.
   * Cached under company:{id}:v{ver}:payroll:13th_month
   */
  async getThirteenthMonthSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payroll', '13th_month'],
      () => this.companySettingsService.getThirteenthMonthSettings(companyId),
      { tags: this.tags(companyId) },
    );
  }

  /**
   * Loan feature limits and thresholds.
   * Cached under company:{id}:v{ver}:payroll:loan
   */
  async getLoanSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payroll', 'loan'],
      () => this.companySettingsService.getLoanSettings(companyId),
      { tags: this.tags(companyId) },
    );
  }

  /**
   * Update a single payroll.* setting.
   * Version bump happens in CompanySettingsService.setSetting -> old cached reads are obsolete.
   */
  async updatePayrollSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `payroll.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
