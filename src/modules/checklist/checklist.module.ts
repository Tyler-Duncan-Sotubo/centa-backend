import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistController } from './checklist.controller';
import { StaffChecklistService } from './services/staff-checklist.service';
import { PayrollChecklistService } from './services/payroll-checklist.service';
import { PerformanceChecklistService } from './services/performance-checklist.service';
import { HiringChecklistService } from './services/hiring-checklist.service';
import { AttendanceChecklistService } from './services/attendance-checklist.service';
import { LeaveChecklistService } from './services/leave-checklist.service';

@Module({
  controllers: [ChecklistController],
  providers: [
    ChecklistService,
    StaffChecklistService,
    PayrollChecklistService,
    PerformanceChecklistService,
    HiringChecklistService,
    AttendanceChecklistService,
    LeaveChecklistService,
  ],
  exports: [
    ChecklistService,
    StaffChecklistService,
    PayrollChecklistService,
    PerformanceChecklistService,
    HiringChecklistService,
    AttendanceChecklistService,
    LeaveChecklistService,
  ],
})
export class ChecklistModule {}
