import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class PayrollSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  /**
   * All payroll.* settings as a flat object (prefix stripped).
   * Cached under company:{id}:v{ver}:payroll:all
   */
  async getAllPayrollSettings(companyId: string): Promise<Record<string, any>> {
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
  }

  /**
   * High-level payroll toggles (uses CompanySettingsService under the hood).
   * Cached under company:{id}:v{ver}:payroll:config
   */
  async payrollSettings(companyId: string): Promise<any> {
    return this.companySettingsService.getPayrollConfig(companyId);
  }

  /**
   * Allowance breakdown percentages & custom allowances.
   * Cached under company:{id}:v{ver}:payroll:allowance
   */
  async allowanceSettings(companyId: string): Promise<any> {
    return this.companySettingsService.getAllowanceConfig(companyId);
  }

  /**
   * Multi-level approval and proration config.
   * Cached under company:{id}:v{ver}:payroll:approval_proration
   */
  async getApprovalAndProrationSettings(companyId: string) {
    return this.companySettingsService.getApprovalAndProrationSettings(
      companyId,
    );
  }

  /**
   * 13th month payment configuration.
   * Cached under company:{id}:v{ver}:payroll:13th_month
   */
  async getThirteenthMonthSettings(companyId: string) {
    return this.companySettingsService.getThirteenthMonthSettings(companyId);
  }

  /**
   * Loan feature limits and thresholds.
   * Cached under company:{id}:v{ver}:payroll:loan
   */
  async getLoanSettings(companyId: string) {
    return this.companySettingsService.getLoanSettings(companyId);
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
