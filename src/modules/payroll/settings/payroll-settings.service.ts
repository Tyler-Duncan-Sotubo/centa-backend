import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class PayrollSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async getAllPayrollSettings(companyId: string): Promise<Record<string, any>> {
    const settings =
      await this.companySettingsService.getAllSettings(companyId);

    const payrollSettings = {};

    for (const setting of settings) {
      if (setting.key.startsWith('payroll.')) {
        const strippedKey = setting.key.replace('payroll.', '');
        payrollSettings[strippedKey] = setting.value;
      }
    }

    return payrollSettings;
  }

  async payrollSettings(companyId: string): Promise<any> {
    return await this.companySettingsService.getPayrollConfig(companyId);
  }

  async allowanceSettings(companyId: string): Promise<any> {
    return await this.companySettingsService.getAllowanceConfig(companyId);
  }

  async getApprovalAndProrationSettings(companyId: string) {
    return await this.companySettingsService.getApprovalAndProrationSettings(
      companyId,
    );
  }

  async getThirteenthMonthSettings(companyId: string) {
    return await this.companySettingsService.getThirteenthMonthSettings(
      companyId,
    );
  }

  async getLoanSettings(companyId: string) {
    return await this.companySettingsService.getLoanSettings(companyId);
  }

  async updatePayrollSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `payroll.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
