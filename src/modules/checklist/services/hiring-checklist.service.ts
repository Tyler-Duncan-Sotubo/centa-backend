// src/hiring-checklist/hiring-checklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { checklistCompletion } from '../schema/checklist.schema';
import { TaskStatus } from '../constants/constants';

// src/hiring-checklist/constants.ts
export const HIRING_EXTRA_KEYS = [
  'pipeline',
  'scorecards',
  'email_templates',
  'offer_templates',
  'create_jobs',
] as const;

export type HiringExtraKey = (typeof HIRING_EXTRA_KEYS)[number];

@Injectable()
export class HiringChecklistService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  /** Read hiring extras from checklist_completion */
  private async getExtraStatuses(
    companyId: string,
  ): Promise<Record<HiringExtraKey, TaskStatus>> {
    const rows = await this.db
      .select({ key: checklistCompletion.checklistKey })
      .from(checklistCompletion)
      .where(
        and(
          eq(checklistCompletion.companyId, companyId),
          inArray(checklistCompletion.checklistKey, [...HIRING_EXTRA_KEYS]),
        ),
      );

    const done = new Set(rows.map((r) => r.key as HiringExtraKey));
    return {
      pipeline: done.has('pipeline') ? 'done' : 'todo',
      scorecards: done.has('scorecards') ? 'done' : 'todo',
      email_templates: done.has('email_templates') ? 'done' : 'todo',
      offer_templates: done.has('offer_templates') ? 'done' : 'todo',
      create_jobs: done.has('create_jobs') ? 'done' : 'todo',
    };
  }

  /** Unified hiring checklist response (extras only) */
  async getHiringChecklist(companyId: string) {
    const extras = await this.getExtraStatuses(companyId);

    const required: string[] = []; // all optional
    const completed = required.length === 0;

    // enforce stable order
    const order: HiringExtraKey[] = [
      'pipeline',
      'scorecards',
      'email_templates',
      'offer_templates',
      'create_jobs',
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
