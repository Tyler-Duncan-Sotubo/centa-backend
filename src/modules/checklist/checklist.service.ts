import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { sql } from 'drizzle-orm';
import { checklistCompletion } from './schema/checklist.schema';
import { ExtraKeyParamDto } from './dto/extra-key.param';
import { AttendanceChecklistService } from './services/attendance-checklist.service';
import { HiringChecklistService } from './services/hiring-checklist.service';
import { LeaveChecklistService } from './services/leave-checklist.service';
import { PayrollChecklistService } from './services/payroll-checklist.service';
import { PerformanceChecklistService } from './services/performance-checklist.service';
import { StaffChecklistService } from './services/staff-checklist.service';

@Injectable()
export class ChecklistService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly svc: StaffChecklistService,
    private readonly payroll: PayrollChecklistService,
    private readonly performance: PerformanceChecklistService,
    private readonly hiring: HiringChecklistService,
    private readonly attendance: AttendanceChecklistService,
    private readonly leave: LeaveChecklistService,
  ) {}

  /** Mark an extra staff item done (idempotent upsert). */
  async markExtraDone(
    companyId: string,
    key: ExtraKeyParamDto['key'],
    userId: string,
  ) {
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

  // status of all checklists
  async getOverallChecklistStatus(companyId: string) {
    const [staff, payroll, performance, hiring, attendance, leave] =
      await Promise.all([
        this.svc.getStaffChecklist(companyId),
        this.payroll.getPayrollChecklist(companyId),
        this.performance.getPerformanceChecklist(companyId),
        this.hiring.getHiringChecklist(companyId),
        this.attendance.getAttendanceChecklist(companyId),
        this.leave.getLeaveChecklist(companyId),
      ]);

    return {
      staff: staff.completed,
      payroll: payroll.completed,
      performance: performance.completed,
      hiring: hiring.completed,
      attendance: attendance.completed,
      leave: leave.completed,
    };
  }
}
