import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { leaveRequests } from '../schema/leave-requests.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { LeavePolicyService } from '../policy/leave-policy.service';
import { LeaveSettingsService } from '../settings/leave-settings.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { User } from 'src/common/types/user.type';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { HolidaysService } from 'src/modules/leave/holidays/holidays.service';
import { and, eq, sql } from 'drizzle-orm';
import { LeaveBalanceService } from '../balance/leave-balance.service';
import { departments, employees, jobRoles } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';
import { BlockedDaysService } from '../blocked-days/blocked-days.service';
import { ReservedDaysService } from '../reserved-days/reserved-days.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly leavePolicyService: LeavePolicyService,
    private readonly leaveSettingsService: LeaveSettingsService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService,
    private readonly holidayService: HolidaysService,
    private readonly blockedDaysService: BlockedDaysService,
    private readonly reservedDaysService: ReservedDaysService,
  ) {}

  async applyForLeave(dto: CreateLeaveRequestDto, user: User, ip: string) {
    const { companyId } = user;

    // a. Check if employee exists
    const employee = await this.employeesService.findEmployeeSummaryByUserId(
      dto.employeeId,
    );

    // 1. Fetch Leave Policy
    const leavePolicy =
      await this.leavePolicyService.findLeavePoliciesByLeaveTypeId(
        companyId,
        dto.leaveTypeId,
      );

    // 2. Confirmed Employee Check
    if (leavePolicy.onlyConfirmedEmployees && !employee.confirmed) {
      const allowUnconfirmed =
        await this.leaveSettingsService.allowUnconfirmedLeave(companyId);

      if (!allowUnconfirmed) {
        throw new ForbiddenException(
          'Only confirmed employees can request this leave.',
        );
      }

      const allowedLeaveTypes =
        await this.leaveSettingsService.allowedLeaveTypesForUnconfirmed(
          companyId,
        );
      if (!allowedLeaveTypes.includes(leavePolicy.leaveTypeId)) {
        throw new ForbiddenException(
          'You are not allowed to request this leave type.',
        );
      }
    }

    // 3. Gender Eligibility Check
    if (
      leavePolicy.genderEligibility !== 'any' &&
      employee.gender !== leavePolicy.genderEligibility
    ) {
      throw new ForbiddenException(
        `Only ${leavePolicy.genderEligibility} employees can request this leave.`,
      );
    }

    // 4. Eligibility Rules (country, department, level)
    const eligibility: {
      countries?: string[];
      departments?: string[];
      employeeLevels?: string[];
    } = leavePolicy.eligibilityRules ?? {};

    if (
      eligibility.countries &&
      employee.country !== null &&
      !eligibility.countries.includes(employee.country)
    ) {
      throw new ForbiddenException(
        'You are not eligible based on your country.',
      );
    }

    if (
      eligibility.departments &&
      !eligibility.departments.includes(employee.department)
    ) {
      throw new ForbiddenException(
        'You are not eligible based on your department.',
      );
    }

    if (
      eligibility.employeeLevels &&
      employee.level !== null &&
      !eligibility.employeeLevels.includes(employee.level)
    ) {
      throw new ForbiddenException(
        'You are not eligible based on your employee level.',
      );
    }

    // 5. Splittable Check
    if (
      !leavePolicy.isSplittable &&
      this.leaveIsSplit(dto.startDate, dto.endDate)
    ) {
      throw new BadRequestException(
        'This leave must be taken as a continuous period.',
      );
    }

    // 6. Minimum Notice Period Check
    const minNoticeDays =
      await this.leaveSettingsService.getMinNoticeDays(companyId);
    if (!this.isEnoughNotice(dto.startDate, minNoticeDays)) {
      throw new BadRequestException(
        `You must apply for leave at least ${minNoticeDays} days in advance.`,
      );
    }

    // 7. Maximum Consecutive Days Check
    const maxConsecutive =
      await this.leaveSettingsService.getMaxConsecutiveLeaveDays(companyId);
    const daysRequested = this.calculateDurationInDays(
      dto.startDate,
      dto.endDate,
    );
    if (daysRequested > maxConsecutive) {
      throw new BadRequestException(
        `You cannot take more than ${maxConsecutive} consecutive leave days.`,
      );
    }

    // 8. Assign Approver
    const multiLevel =
      await this.leaveSettingsService.isMultiLevelApproval(companyId);

    let approverId = '';
    const approvalChain: {
      level: number;
      approverRole: string;
      approverId: string;
      status: string;
      actionedAt: Date | null;
    }[] = [];

    if (multiLevel) {
      const chain = await this.leaveSettingsService.getApprovalChain(companyId);
      let level = 0;
      for (const role of chain) {
        const approver = await this.determineApproverByRole(
          employee.id,
          companyId,
          role,
        );

        if (!approver) {
          throw new NotFoundException(`Approver for role '${role}' not found.`);
        }

        approvalChain.push({
          level,
          approverRole: role,
          approverId: approver,
          status: 'pending',
          actionedAt: null,
        });

        level++;
      }
      // Set first approver
      approverId = approvalChain[0].approverId;
    } else {
      const approverSetting =
        await this.leaveSettingsService.getApproverSetting(companyId);
      approverId = await this.determineApproverByRole(
        employee.id,
        companyId,
        approverSetting,
      );
    }

    // 9. check Blocked Days FIRST
    const requestedDates = this.listDatesBetween(dto.startDate, dto.endDate);
    const blockedDays =
      await this.blockedDaysService.getBlockedDates(companyId);

    const blockedDate = requestedDates.find((date) =>
      blockedDays.includes(date),
    );
    if (blockedDate) {
      throw new BadRequestException(
        `Cannot request leave on blocked day: ${blockedDate}`,
      );
    }

    // 9b Reserved Days Check
    const reservedDays = await this.reservedDaysService.getReservedDates(
      companyId,
      employee.id,
    );

    const reservedDate = requestedDates.find((date) =>
      reservedDays.includes(date),
    );
    if (reservedDate) {
      throw new BadRequestException(
        `Cannot request leave on reserved day: ${reservedDate}`,
      );
    }

    // 10 Check Weekend and Public Holidays Rules
    const excludeWeekends =
      await this.leaveSettingsService.excludeWeekends(companyId);
    const weekendDays =
      await this.leaveSettingsService.getWeekendDays(companyId);
    const excludePublicHolidays =
      await this.leaveSettingsService.excludePublicHolidays(companyId);

    const effectiveLeaveDays = await this.calculateEffectiveLeaveDays(
      companyId,
      requestedDates,
      excludeWeekends,
      weekendDays,
      excludePublicHolidays,
      dto.partialDay,
    );

    if (effectiveLeaveDays <= 0) {
      throw new BadRequestException(
        'No effective leave days available for the requested period.',
      );
    }

    // 11. Check Leave Balance
    const leaveBalance = await this.leaveBalanceService.findBalanceByLeaveType(
      companyId,
      employee.id,
      dto.leaveTypeId,
      new Date().getFullYear(),
    );

    if (!leaveBalance) {
      throw new BadRequestException(
        'No leave balance found for this leave type.',
      );
    }

    const availableBalance = Number(leaveBalance.balance);

    const allowNegativeBalance =
      await this.leaveSettingsService.allowNegativeBalance(companyId);

    if (!allowNegativeBalance && availableBalance < effectiveLeaveDays) {
      throw new ForbiddenException(
        `Insufficient leave balance. You have ${availableBalance} days left.`,
      );
    }

    // 12. Create Leave Request
    const [leaveRequest] = await this.db
      .insert(leaveRequests)
      .values({
        companyId,
        employeeId: employee.id,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
        status: 'pending',
        approverId,
        totalDays: effectiveLeaveDays.toString(),
        requestedAt: new Date(),
        partialDay: dto.partialDay,
        approvalChain,
      })
      .returning();

    // 13. (Optional) Trigger Notifications here

    // 14. Create Audit Record
    await this.auditService.logAction({
      action: 'create',
      entity: 'leave_request',
      entityId: leaveRequest.id,
      userId: employee.userId,
      ipAddress: ip,
      details: 'Leave request created',
      changes: {
        companyId,
        employeeId: employee.id,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
        status: 'pending',
        approverId,
      },
    });

    return leaveRequest;
  }

  private async determineApproverByRole(
    employeeId: string,
    companyId: string,
    role: string,
  ): Promise<string> {
    if (role === 'manager') {
      return await this.employeesService.findManagerByEmployeeId(
        employeeId,
        companyId,
      );
    }
    if (role === 'hr_manager') {
      return await this.employeesService.findHrRepresentative(companyId);
    }
    if (role === 'super_admin') {
      return await this.employeesService.findSuperAdminUser(companyId);
    }
    throw new BadRequestException(`Unsupported approver role: ${role}`);
  }

  // Helper: Check if leave is split
  private leaveIsSplit(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 0;
  }

  // Helper: Check if enough notice is given
  private isEnoughNotice(startDate: string, minNoticeDays: number) {
    const start = new Date(startDate);
    const now = new Date();
    const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= minNoticeDays;
  }

  // Helper: Calculate leave duration
  private calculateDurationInDays(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays + 1; // +1 to count both start and end dates inclusive
  }

  private listDatesBetween(start: string, end: string): string[] {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const dates: string[] = [];

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(d.toISOString().substring(0, 10)); // Format YYYY-MM-DD
    }

    return dates;
  }

  private async calculateEffectiveLeaveDays(
    companyId: string,
    requestedDates: string[], // already list of 'YYYY-MM-DD'
    excludeWeekends: boolean,
    weekendDays: string[],
    excludePublicHolidays: boolean,
    partialDay?: 'AM' | 'PM',
  ): Promise<number> {
    let effectiveDates = [...requestedDates];

    // Step 1: Exclude weekends if setting is enabled
    if (excludeWeekends) {
      const weekendSet = new Set(weekendDays.map((day) => day.toLowerCase()));

      effectiveDates = effectiveDates.filter((dateStr) => {
        const date = new Date(dateStr);
        const dayName = date
          .toLocaleDateString('en-US', { weekday: 'long' })
          .toLowerCase();
        return !weekendSet.has(dayName);
      });
    }

    // Step 2: Exclude public holidays if setting is enabled
    if (excludePublicHolidays) {
      const startDate = requestedDates[0];
      const end = requestedDates[requestedDates.length - 1];

      const holidaysInRange = await this.holidayService.listHolidaysInRange(
        companyId,
        startDate,
        end,
      );

      const holidayDates = new Set(
        holidaysInRange.map((holiday) => holiday.date),
      );

      effectiveDates = effectiveDates.filter((date) => !holidayDates.has(date));
    }

    let totalDays = effectiveDates.length;

    // Step 3: Handle Partial Day
    if (partialDay && totalDays === 1) {
      // Only allow half-day if only one day is selected
      totalDays = 0.5;
    }

    return totalDays;
  }

  // Get Approved Leave Request for Company
  async findAll(companyId: string) {
    const leaveRequestsData = await this.db
      .select({
        employeeId: leaveRequests.employeeId,
        requestId: leaveRequests.id,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        leaveType: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        department: departments.name,
        jobRole: jobRoles.title,
        totalDays: leaveRequests.totalDays,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(and(eq(leaveRequests.companyId, companyId)))
      .execute();

    if (!leaveRequestsData) {
      throw new NotFoundException('Leave requests not found');
    }

    return leaveRequestsData;
  }

  // Get Leave Requests by Employee ID
  async findAllByEmployeeId(employeeId: string, companyId: string) {
    const leaveRequestsData = await this.db
      .select({
        requestId: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        leaveType: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.companyId, companyId),
        ),
      )
      .execute();

    if (!leaveRequestsData) {
      throw new NotFoundException('Leave requests not found');
    }

    return leaveRequestsData;
  }

  async findOneById(leaveRequestId: string, companyId: string) {
    const [leaveRequest] = await this.db
      .select({
        requestId: leaveRequests.id,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.id, leaveRequestId),
          eq(leaveRequests.companyId, companyId),
        ),
      )
      .execute();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
  }
}
