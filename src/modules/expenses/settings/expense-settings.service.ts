import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class ExpensesSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 60; // adjust as needed

  private tags(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:expense`,
    ];
  }

  /**
   * Returns all expense.* settings as a flat object with the "expense." prefix stripped.
   * Cached under company:{id}:v{ver}:expenses:all
   */
  async getAllExpenseSettings(companyId: string): Promise<Record<string, any>> {
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['expenses', 'all'],
      async () => {
        const settings =
          await this.companySettingsService.getAllSettings(companyId);
        const expenseSettings: Record<string, any> = {};
        for (const setting of settings) {
          if (setting.key.startsWith('expense.')) {
            const strippedKey = setting.key.replace('expense.', '');
            expenseSettings[strippedKey] = setting.value;
          }
        }
        return expenseSettings;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  /**
   * Returns the expense approval config.
   * Cached under company:{id}:v{ver}:expenses:config
   */
  async getExpenseSettings(companyId: string) {
    return this.cache.getOrSetVersioned<{
      multiLevelApproval: boolean;
      approverChain: string[];
      fallbackRoles: string[];
    }>(
      companyId,
      ['expenses', 'config'],
      async () => {
        const keys = [
          'expense.multi_level_approval',
          'expense.approver_chain',
          'expense.approval_fallback',
        ];

        const rows = await this.companySettingsService.fetchSettings(
          companyId,
          keys,
        );

        const parseMaybeJsonArray = (val: unknown): string[] => {
          if (Array.isArray(val)) return val as string[];
          if (typeof val === 'string' && val.trim().length) {
            try {
              const parsed = JSON.parse(val);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        };

        return {
          multiLevelApproval: Boolean(rows['expense.multi_level_approval']),
          approverChain: parseMaybeJsonArray(rows['expense.approver_chain']),
          fallbackRoles: parseMaybeJsonArray(rows['expense.approval_fallback']),
        };
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  /**
   * Update a single expense.* setting.
   * Version bump handled inside CompanySettingsService.setSetting -> cache invalidated by version.
   */
  async updateExpenseSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `expense.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
    // No manual cache clear needed; versioned keys make older entries irrelevant.
  }
}
