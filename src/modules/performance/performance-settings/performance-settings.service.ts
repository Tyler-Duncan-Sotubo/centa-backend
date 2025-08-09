import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PerformanceSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(PerformanceSettingsService.name);
  }

  // ---------- cache keys ----------
  private allKey(companyId: string) {
    return `perf:${companyId}:all`;
  }
  private summaryKey(companyId: string) {
    return `perf:${companyId}:summary`;
  }

  private async burst(companyId: string) {
    await Promise.allSettled([
      this.cache.del(this.allKey(companyId)),
      this.cache.del(this.summaryKey(companyId)),
    ]);
    this.logger.debug({ companyId }, 'performance:cache:burst');
  }

  async getAllPerformanceSettings(
    companyId: string,
  ): Promise<Record<string, any>> {
    const key = this.allKey(companyId);
    this.logger.debug({ companyId, key }, 'performance:getAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const settings =
        await this.companySettingsService.getAllSettings(companyId);

      const performanceSettings: Record<string, any> = {};
      for (const setting of settings) {
        if (setting.key.startsWith('performance.')) {
          const strippedKey = setting.key.replace('performance.', '');
          performanceSettings[strippedKey] = setting.value;
        }
      }

      this.logger.debug(
        { companyId, count: Object.keys(performanceSettings).length },
        'performance:getAll:db:done',
      );
      return performanceSettings;
    });
  }

  async getPerformanceSettings(companyId: string) {
    const key = this.summaryKey(companyId);
    this.logger.debug({ companyId, key }, 'performance:getSummary:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const keys = [
        'performance.auto_create_cycles',
        'performance.review_frequency',
        'performance.enable_self_review',
        'performance.require_review_rating',
        'performance.review_score_scale',
        'performance.notify_review_overdue',
        'performance.notify_review_upcoming',
        'performance.review_reminder_offset_days',
        'performance.notify_goal_updated_by_employee',
        'performance.goal_reminder_frequency',
        // Appraisal automation
        'performance.auto_create_appraisals',
        'performance.appraisals_frequency',
        'performance.appraisal_include_new_employees',
        'performance.default_manager_assignment',
        'performance.allow_manager_override',
        'performance.auto_finalize_deadline_days',
      ];

      const rows = await this.companySettingsService.fetchSettings(
        companyId,
        keys,
      );

      const result = {
        autoCreateCycles: Boolean(rows['performance.auto_create_cycles']),
        reviewFrequency: rows['performance.review_frequency'] ?? 'annual',
        enableSelfReview: Boolean(rows['performance.enable_self_review']),
        requireReviewRating: Boolean(rows['performance.require_review_rating']),
        reviewScoreScale: Number(rows['performance.review_score_scale']) || 100,
        notifyReviewOverdue: rows['performance.notify_review_overdue'] ?? [
          'employee',
          'manager',
        ],
        notifyReviewUpcoming: rows['performance.notify_review_upcoming'] ?? [
          'employee',
        ],
        reviewReminderOffsetDays:
          Number(rows['performance.review_reminder_offset_days']) || 3,
        notifyGoalUpdatedByEmployee: rows[
          'performance.notify_goal_updated_by_employee'
        ] ?? ['manager'],
        goalReminderFrequency:
          rows['performance.goal_reminder_frequency'] ?? 'weekly',

        // Appraisal Automation
        autoCreateAppraisals: Boolean(
          rows['performance.auto_create_appraisals'],
        ),
        appraisalFrequency:
          rows['performance.appraisals_frequency'] ?? 'annual',
        appraisalIncludeNewEmployees: Boolean(
          rows['performance.appraisal_include_new_employees'],
        ),
        defaultManagerAssignment: Boolean(
          rows['performance.default_manager_assignment'],
        ),
        allowManagerOverride: Boolean(
          rows['performance.allow_manager_override'],
        ),
        autoFinalizeDeadlineDays:
          Number(rows['performance.auto_finalize_deadline_days']) || 5,
      };

      this.logger.debug({ companyId }, 'performance:getSummary:db:done');
      return result;
    });
  }

  async updatePerformanceSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `performance.${key}`;
    this.logger.info(
      { companyId, key: settingKey },
      'performance:update:start',
    );

    await this.companySettingsService.setSetting(companyId, settingKey, value);

    await this.burst(companyId);
    this.logger.info({ companyId, key: settingKey }, 'performance:update:done');
  }
}
