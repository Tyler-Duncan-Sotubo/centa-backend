// src/leave-checklist/leave-checklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { TaskStatus } from '../constants/constants';
import { checklistCompletion } from '../schema/checklist.schema';

export const LEAVE_EXTRA_KEYS = [
  'leave_settings',
  'leave_types_policies',
  'holidays',
  'blocked_days',
  'reserved_days',
] as const;

export type LeaveExtraKey = (typeof LEAVE_EXTRA_KEYS)[number];

@Injectable()
export class LeaveChecklistService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  private async getExtraStatuses(
    companyId: string,
  ): Promise<Record<LeaveExtraKey, TaskStatus>> {
    const rows = await this.db
      .select({ key: checklistCompletion.checklistKey })
      .from(checklistCompletion)
      .where(
        and(
          eq(checklistCompletion.companyId, companyId),
          inArray(checklistCompletion.checklistKey, [...LEAVE_EXTRA_KEYS]),
        ),
      );

    const done = new Set(rows.map((r) => r.key as LeaveExtraKey));
    return {
      leave_settings: done.has('leave_settings') ? 'done' : 'todo',
      leave_types_policies: done.has('leave_types_policies') ? 'done' : 'todo',
      holidays: done.has('holidays') ? 'done' : 'todo',
      blocked_days: done.has('blocked_days') ? 'done' : 'todo',
      reserved_days: done.has('reserved_days') ? 'done' : 'todo',
    };
  }

  async getLeaveChecklist(companyId: string) {
    const extras = await this.getExtraStatuses(companyId);

    // stable order to match your sidebar flow
    const order: LeaveExtraKey[] = [
      'leave_settings',
      'leave_types_policies',
      'holidays',
      'blocked_days',
      'reserved_days',
    ];

    const tasks: Record<string, TaskStatus> = {};
    for (const key of order) tasks[key] = extras[key];

    const required = order; // all keys required
    const completed = required.every((key) => tasks[key] === 'done');

    return {
      tasks,
      required,
      completed,
      disabledWhenComplete: true,
    };
  }
}
