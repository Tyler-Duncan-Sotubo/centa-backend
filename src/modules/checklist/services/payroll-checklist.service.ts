// src/payroll-checklist/payroll-checklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { TaskStatus } from '../constants/constants';
import { checklistCompletion } from '../schema/checklist.schema';

type PayrollExtraKey = 'general_settings' | 'pay_adjustments';

const PAYROLL_EXTRA_KEYS: PayrollExtraKey[] = [
  'general_settings',
  'pay_adjustments',
] as const;

@Injectable()
export class PayrollChecklistService {
  constructor(
    private readonly companySettings: CompanySettingsService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  /** Read payroll extras (general_settings, pay_adjustments) from checklist_completion. */
  private async getExtraStatuses(
    companyId: string,
  ): Promise<Record<PayrollExtraKey, TaskStatus>> {
    const rows = await this.db
      .select({ key: checklistCompletion.checklistKey })
      .from(checklistCompletion)
      .where(
        and(
          eq(checklistCompletion.companyId, companyId),
          inArray(checklistCompletion.checklistKey, PAYROLL_EXTRA_KEYS),
        ),
      );

    const done = new Set(rows.map((r) => r.key as PayrollExtraKey));
    return {
      general_settings: done.has('general_settings') ? 'done' : 'todo',
      pay_adjustments: done.has('pay_adjustments') ? 'done' : 'todo',
    };
  }

  /**
   * Unified Payroll checklist response:
   * - mandatory payroll module from CompanySettingsService
   * - overlay extra payroll items (optional; not part of REQUIRED)
   * - completed is computed ONLY from REQUIRED payroll tasks
   */
  async getPayrollChecklist(companyId: string) {
    const [payroll, extras] = await Promise.all([
      this.companySettings.getOnboardingModule(companyId, 'payroll'),
      this.getExtraStatuses(companyId),
    ]);

    const tasks: Record<string, TaskStatus> = {
      ...(payroll.tasks || {}),
      ...extras,
    };

    const required = payroll.required || [];
    const completed = required.every((t) => tasks[t] === 'done');

    // enforce the order you want
    const order = [
      'pay_schedule',
      'pay_group',
      'salary_structure',
      'tax_details',
      'cost_center',
      'general_settings',
      'pay_adjustments',
    ] as const;

    // rebuild object in this order
    const orderedTasks: Record<string, TaskStatus> = {};
    for (const key of order) {
      if (tasks[key] !== undefined) {
        orderedTasks[key] = tasks[key];
      }
    }

    return {
      tasks: orderedTasks,
      required,
      completed,
      disabledWhenComplete: payroll.disabledWhenComplete ?? true,
    };
  }
}
