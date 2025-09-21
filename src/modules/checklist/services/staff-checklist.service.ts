// src/staff-checklist/staff-checklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { checklistCompletion } from '../schema/checklist.schema';
import { TaskStatus } from '../constants/constants';

type ExtraKey = 'onboarding_templates' | 'offboarding_process';

const EXTRA_KEYS: ExtraKey[] = [
  'onboarding_templates',
  'offboarding_process',
] as const;

@Injectable()
export class StaffChecklistService {
  constructor(
    private readonly settings: CompanySettingsService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  /** Read optional staff extras from checklist_completion and return statuses. */
  private async getExtraStatuses(
    companyId: string,
  ): Promise<Record<ExtraKey, TaskStatus>> {
    const rows = await this.db
      .select({ key: checklistCompletion.checklistKey })
      .from(checklistCompletion)
      .where(
        and(
          eq(checklistCompletion.companyId, companyId),
          inArray(checklistCompletion.checklistKey, EXTRA_KEYS),
        ),
      );

    const done = new Set(rows.map((r) => r.key as ExtraKey));
    return {
      onboarding_templates: done.has('onboarding_templates') ? 'done' : 'todo',
      offboarding_process: done.has('offboarding_process') ? 'done' : 'todo',
    };
  }

  /** Mark an extra staff item done (idempotent upsert). */
  async markExtraDone(companyId: string, key: ExtraKey, userId: string) {
    await this.db
      .insert(checklistCompletion)
      .values({ companyId, checklistKey: key, completedBy: userId })
      .onConflictDoUpdate({
        // requires a unique index on (companyId, checklistKey)
        target: [
          checklistCompletion.companyId,
          checklistCompletion.checklistKey,
        ],
        set: {
          completedBy: sql`EXCLUDED.completed_by`,
          completedAt: sql`now()`,
        },
      });
  }

  /**
   * Unified Staff checklist:
   * - Pull mandatory module blobs from CompanySettingsService (company + employees)
   * - Overlay extra staff-only items from checklist_completion
   * - Completion is based ONLY on required items from company/employees
   */
  async getStaffChecklist(companyId: string) {
    const [company, employees, extras] = await Promise.all([
      this.settings.getOnboardingModule(companyId, 'company'),
      this.settings.getOnboardingModule(companyId, 'employees'),
      this.getExtraStatuses(companyId),
    ]);

    const tasks: Record<string, TaskStatus> = {
      ...(company.tasks || {}),
      ...(employees.tasks || {}),
      ...extras, // optional, not required
    };

    const required = [
      ...(company.required || []),
      ...(employees.required || []),
    ];
    const completed = required.every((t) => tasks[t] === 'done');

    return {
      tasks,
      required,
      completed,
      disabledWhenComplete:
        (company.disabledWhenComplete ?? true) &&
        (employees.disabledWhenComplete ?? true),
    };
  }
}
