// src/performance-checklist/performance-checklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { checklistCompletion } from '../schema/checklist.schema';
import { TaskStatus } from '../constants/constants';

// src/performance-checklist/constants.ts
export const PERFORMANCE_EXTRA_KEYS = [
  'performance_general',
  'goal_policies',
  'feedback_settings',
  'competency',
  'performance_templates',
  'appraisal_framework',
  'start_1_1_checkin',
] as const;

export type PerformanceExtraKey = (typeof PERFORMANCE_EXTRA_KEYS)[number];

@Injectable()
export class PerformanceChecklistService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  /** Read performance extras from checklist_completion. */
  private async getExtraStatuses(
    companyId: string,
  ): Promise<Record<PerformanceExtraKey, TaskStatus>> {
    const rows = await this.db
      .select({ key: checklistCompletion.checklistKey })
      .from(checklistCompletion)
      .where(
        and(
          eq(checklistCompletion.companyId, companyId),
          inArray(checklistCompletion.checklistKey, [
            ...PERFORMANCE_EXTRA_KEYS,
          ]),
        ),
      );

    const done = new Set(rows.map((r) => r.key as PerformanceExtraKey));
    return {
      performance_general: done.has('performance_general') ? 'done' : 'todo',
      goal_policies: done.has('goal_policies') ? 'done' : 'todo',
      feedback_settings: done.has('feedback_settings') ? 'done' : 'todo',
      competency: done.has('competency') ? 'done' : 'todo',
      performance_templates: done.has('performance_templates')
        ? 'done'
        : 'todo',
      appraisal_framework: done.has('appraisal_framework') ? 'done' : 'todo',
      start_1_1_checkin: done.has('start_1_1_checkin') ? 'done' : 'todo',
    };
  }

  /**
   * Unified Performance checklist response (extras-only).
   * - required defaults to []
   * - completed is true if there are no required tasks
   */
  async getPerformanceChecklist(companyId: string) {
    const extras = await this.getExtraStatuses(companyId);

    const required: string[] = []; // no required tasks
    const completed = required.length === 0;

    // enforce stable order
    const order: PerformanceExtraKey[] = [
      'performance_general',
      'goal_policies',
      'feedback_settings',
      'competency',
      'performance_templates',
      'appraisal_framework',
      'start_1_1_checkin',
    ];

    const orderedTasks: Record<string, TaskStatus> = {};
    for (const key of order) {
      orderedTasks[key] = extras[key];
    }

    return {
      tasks: orderedTasks,
      required,
      completed,
      disabledWhenComplete: true,
    };
  }
}
