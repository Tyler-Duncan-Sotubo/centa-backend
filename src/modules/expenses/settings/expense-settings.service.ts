import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ExpensesSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExpensesSettingsService.name);
  }

  // ---- cache keys ---------------------------------------------------
  private allKey(companyId: string) {
    return `company:${companyId}:expense:settings:all`;
  }
  private oneKey(companyId: string) {
    return `company:${companyId}:expense:settings:normalized`;
  }

  // ---- helpers ------------------------------------------------------
  private safeJson<T = any>(v: any, fallback: T): T {
    if (Array.isArray(v)) return v as T;
    if (typeof v !== 'string') return fallback;
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  }

  // ---- READS (cached) ----------------------------------------------
  async getAllExpenseSettings(companyId: string): Promise<Record<string, any>> {
    return this.cache.getOrSetCache(
      this.allKey(companyId),
      async () => {
        this.logger.debug({ companyId }, 'getAllExpenseSettings:miss');
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
      } /* , { ttl: 300 } */,
    );
  }

  async getExpenseSettings(companyId: string) {
    return this.cache.getOrSetCache(
      this.oneKey(companyId),
      async () => {
        this.logger.debug({ companyId }, 'getExpenseSettings:miss');

        const keys = [
          'expense.multi_level_approval',
          'expense.approver_chain',
          'expense.approval_fallback',
        ];

        const rows = await this.companySettingsService.fetchSettings(
          companyId,
          keys,
        );

        // Normalize / parse with fallbacks
        const multiLevelApproval = Boolean(
          rows['expense.multi_level_approval'],
        );
        const approverChain = this.safeJson(
          rows['expense.approver_chain'],
          [] as string[],
        );
        const fallbackRoles = this.safeJson(
          rows['expense.approval_fallback'],
          [] as string[],
        );

        return { multiLevelApproval, approverChain, fallbackRoles };
      } /* , { ttl: 300 } */,
    );
  }

  // ---- WRITE (burst caches) ----------------------------------------
  async updateExpenseSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `expense.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);

    // burst local caches for this company
    const jobs = [
      this.cache.del(this.allKey(companyId)),
      this.cache.del(this.oneKey(companyId)),
    ];
    await Promise.allSettled(jobs);

    this.logger.debug(
      { companyId, key, burst: ['all', 'normalized'] },
      'updateExpenseSetting:cache-busted',
    );
  }
}
