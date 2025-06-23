import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class ExpensesSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async getAllExpenseSettings(companyId: string): Promise<Record<string, any>> {
    const settings =
      await this.companySettingsService.getAllSettings(companyId);
    const expenseSettings = {};

    for (const setting of settings) {
      if (setting.key.startsWith('expense.')) {
        const strippedKey = setting.key.replace('expense.', '');
        expenseSettings[strippedKey] = setting.value;
      }
    }

    return expenseSettings;
  }

  async getExpenseSettings(companyId: string) {
    const keys = [
      'expense.multi_level_approval',
      'expense.approver_chain',
      'expense.approval_fallback',
    ];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

    return {
      multiLevelApproval: Boolean(rows['expense.multi_level_approval']),
      approverChain: Array.isArray(rows['expense.approver_chain'])
        ? rows['expense.approver_chain']
        : JSON.parse(rows['expense.approver_chain'] || '[]'),
      fallbackRoles: Array.isArray(rows['expense.approval_fallback'])
        ? rows['expense.approval_fallback']
        : JSON.parse(rows['expense.approval_fallback'] || '[]'),
    };
  }

  async updateExpenseSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `expense.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
