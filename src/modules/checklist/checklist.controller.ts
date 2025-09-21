// src/staff-checklist/staff-checklist.controller.ts
import { Controller, Get, Patch, UseGuards, Body } from '@nestjs/common';
import { StaffChecklistService } from './services/staff-checklist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { ExtraKeyParamDto } from './dto/extra-key.param';
import { ChecklistService } from './checklist.service';
import { PayrollChecklistService } from './services/payroll-checklist.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { PerformanceChecklistService } from './services/performance-checklist.service';
import { HiringChecklistService } from './services/hiring-checklist.service';
import { AttendanceChecklistService } from './services/attendance-checklist.service';
import { LeaveChecklistService } from './services/leave-checklist.service';

@Controller('checklist')
@UseGuards(JwtAuthGuard)
export class ChecklistController extends BaseController {
  constructor(
    private readonly svc: StaffChecklistService,
    private readonly checklist: ChecklistService,
    private readonly payroll: PayrollChecklistService,
    private readonly performance: PerformanceChecklistService,
    private readonly hiring: HiringChecklistService,
    private readonly attendance: AttendanceChecklistService,
    private readonly leave: LeaveChecklistService,
  ) {
    super();
  }

  @Get('staff-progress')
  async progress(@CurrentUser() user: User) {
    return await this.svc.getStaffChecklist(user.companyId);
  }

  @Get('payroll-progress')
  async payrollChecklist(@CurrentUser() user: User) {
    return await this.payroll.getPayrollChecklist(user.companyId);
  }

  @Get('performance-progress')
  async performanceChecklist(@CurrentUser() user: User) {
    return await this.performance.getPerformanceChecklist(user.companyId);
  }

  @Get('hiring-progress')
  async hiringChecklist(@CurrentUser() user: User) {
    return await this.hiring.getHiringChecklist(user.companyId);
  }

  @Get('attendance-progress')
  async attendanceChecklist(@CurrentUser() user: User) {
    return await this.attendance.getAttendanceChecklist(user.companyId);
  }

  @Get('leave-progress')
  async leaveChecklist(@CurrentUser() user: User) {
    return await this.leave.getLeaveChecklist(user.companyId);
  }

  @Patch('done')
  async done(
    @CurrentUser() user: User,
    @Body('key') key: ExtraKeyParamDto['key'],
  ) {
    await this.checklist.markExtraDone(user.companyId, key, user.id);
    return { status: 'success' };
  }
}
