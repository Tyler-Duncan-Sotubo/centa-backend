// src/attendance-checklist/attendance-checklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { TaskStatus } from '../constants/constants';
import { checklistCompletion } from '../schema/checklist.schema';

export const ATTENDANCE_EXTRA_KEYS = [
  'attendance_setting',
  'shift_management',
  'assign_rota',
  'add_office_location',
] as const;

export type AttendanceExtraKey = (typeof ATTENDANCE_EXTRA_KEYS)[number];

@Injectable()
export class AttendanceChecklistService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  private async getExtraStatuses(
    companyId: string,
  ): Promise<Record<AttendanceExtraKey, TaskStatus>> {
    const rows = await this.db
      .select({ key: checklistCompletion.checklistKey })
      .from(checklistCompletion)
      .where(
        and(
          eq(checklistCompletion.companyId, companyId),
          inArray(checklistCompletion.checklistKey, [...ATTENDANCE_EXTRA_KEYS]),
        ),
      );

    const done = new Set(rows.map((r) => r.key as AttendanceExtraKey));
    return {
      attendance_setting: done.has('attendance_setting') ? 'done' : 'todo',
      shift_management: done.has('shift_management') ? 'done' : 'todo',
      assign_rota: done.has('assign_rota') ? 'done' : 'todo',
      add_office_location: done.has('add_office_location') ? 'done' : 'todo',
    };
  }

  async getAttendanceChecklist(companyId: string) {
    const extras = await this.getExtraStatuses(companyId);

    const required: string[] = []; // all optional
    const completed = required.length === 0;

    const order: AttendanceExtraKey[] = [
      'attendance_setting',
      'shift_management',
      'assign_rota',
      'add_office_location',
    ];

    const tasks: Record<string, TaskStatus> = {};
    for (const key of order) tasks[key] = extras[key];

    return {
      tasks,
      required,
      completed,
      disabledWhenComplete: true,
    };
  }
}
