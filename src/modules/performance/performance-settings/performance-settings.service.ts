import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class PerformanceSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 60; // tune as needed

  private tags(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:performance`,
    ];
  }

  /**
   * All performance.* settings as a flat object (prefix stripped).
   * Cached under company:{id}:v{ver}:performance:all
   */
  async getAllPerformanceSettings(
    companyId: string,
  ): Promise<Record<string, any>> {
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['performance', 'all'],
      async () => {
        const settings =
          await this.companySettingsService.getAllSettings(companyId);
        const performanceSettings: Record<string, any> = {};
        for (const setting of settings) {
          if (setting.key.startsWith('performance.')) {
            const strippedKey = setting.key.replace('performance.', '');
            performanceSettings[strippedKey] = setting.value;
          }
        }
        return performanceSettings;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  /**
   * Structured performance configuration.
   * Cached under company:{id}:v{ver}:performance:config
   */
  async getPerformanceSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['performance', 'config'],
      async () => {
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

        const asArray = (v: unknown, fallback: string[]) => {
          if (Array.isArray(v)) return v as string[];
          if (typeof v === 'string' && v.trim()) {
            try {
              const parsed = JSON.parse(v);
              return Array.isArray(parsed) ? parsed : fallback;
            } catch {
              return fallback;
            }
          }
          return fallback;
        };

        return {
          autoCreateCycles: Boolean(rows['performance.auto_create_cycles']),
          reviewFrequency: rows['performance.review_frequency'] ?? 'annual',
          enableSelfReview: Boolean(rows['performance.enable_self_review']),
          requireReviewRating: Boolean(
            rows['performance.require_review_rating'],
          ),
          reviewScoreScale:
            Number(rows['performance.review_score_scale']) || 100,
          notifyReviewOverdue: asArray(
            rows['performance.notify_review_overdue'],
            ['employee', 'manager'],
          ),
          notifyReviewUpcoming: asArray(
            rows['performance.notify_review_upcoming'],
            ['employee'],
          ),
          reviewReminderOffsetDays:
            Number(rows['performance.review_reminder_offset_days']) || 3,
          notifyGoalUpdatedByEmployee: asArray(
            rows['performance.notify_goal_updated_by_employee'],
            ['manager'],
          ),
          goalReminderFrequency:
            rows['performance.goal_reminder_frequency'] ?? 'weekly',

          // Appraisal automation
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  /**
   * Update a single performance.* setting.
   * Version bump happens in CompanySettingsService.setSetting -> cached reads become stale automatically.
   */
  async updatePerformanceSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `performance.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
