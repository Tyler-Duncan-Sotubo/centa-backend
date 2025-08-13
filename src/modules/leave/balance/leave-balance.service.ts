import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { leaveBalances } from '../schema/leave-balance.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { departments, employees, jobRoles } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';

@Injectable()
export class LeaveBalanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}
  protected table = leaveBalances;

  async create(
    leaveTypeId: string,
    companyId: string,
    employeeId: string,
    year: number,
    entitlement: string,
    used: string,
    balance: string,
  ) {
    const leaveBalance = await this.db
      .insert(this.table)
      .values({
        leaveTypeId,
        companyId,
        employeeId,
        year,
        entitlement,
        used,
        balance,
      })
      .returning()
      .execute();

    return leaveBalance;
  }

  async findAll(companyId: string) {
    const results = await this.db
      .select({
        employeeId: this.table.employeeId,
        companyId: employees.companyId,
        name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        department: departments.name,
        jobRole: jobRoles.title,
        totalBalance: sql<string>`SUM(${this.table.balance})`,
      })
      .from(this.table)
      .innerJoin(employees, eq(this.table.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .where(eq(this.table.companyId, companyId))
      .groupBy(
        this.table.employeeId,
        employees.companyId,
        employees.firstName,
        employees.lastName,
        departments.name,
        jobRoles.title,
      )
      .execute();

    return results;
  }

  async findByEmployeeId(employeeId: string) {
    const currentYear = new Date().getFullYear();

    const results = await this.db
      .select({
        leaveTypeId: leaveTypes.id,
        leaveTypeName: leaveTypes.name,
        year: this.table.year,
        entitlement: this.table.entitlement,
        used: this.table.used,
        balance: this.table.balance,
      })
      .from(this.table)
      .innerJoin(leaveTypes, eq(this.table.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(this.table.employeeId, employeeId),
          eq(this.table.year, currentYear),
        ),
      )
      .orderBy(leaveTypes.name)
      .execute();

    return results;
  }

  async findBalanceByLeaveType(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    currentYear: number,
  ) {
    const [balance] = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.companyId, companyId),
          eq(this.table.leaveTypeId, leaveTypeId),
          eq(this.table.year, Number(currentYear)),
          eq(this.table.employeeId, employeeId),
        ),
      );

    if (!balance) {
      return null;
    }

    return balance;
  }

  async update(balanceId: string, dto: UpdateLeaveBalanceDto) {
    // 1. Check if leave balance exists
    const existingLeaveBalance = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, balanceId))
      .execute();

    if (existingLeaveBalance.length === 0) {
      throw new NotFoundException(`Leave balance not found`);
    }

    // 2. Update leave balance
    const [updatedLeaveBalance] = await this.db
      .update(this.table)
      .set(dto)
      .where(eq(this.table.id, balanceId))
      .returning()
      .execute();

    return updatedLeaveBalance;
  }

  async updateLeaveBalanceOnLeaveApproval(
    leaveTypeId: string,
    employeeId: string,
    year: number,
    totalLeaveDays: string,
    userId: string,
  ) {
    // 1. Check if leave balance exists
    const [leaveBalance] = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.leaveTypeId, leaveTypeId),
          eq(this.table.year, year),
          eq(this.table.employeeId, employeeId),
        ),
      )
      .execute();

    if (!leaveBalance) {
      throw new NotFoundException(`Leave balance not found`);
    }

    const updatedUsed = Number(leaveBalance.used) + Number(totalLeaveDays);
    const updatedBalance =
      Number(leaveBalance.balance) - Number(totalLeaveDays);

    // 2. Update leave balance
    const updatedLeaveBalance = await this.db
      .update(this.table)
      .set({
        used: updatedUsed.toFixed(2), // Format only final value
        balance: updatedBalance.toFixed(2), // Format only final value
      })
      .where(eq(this.table.id, leaveBalance.id))
      .returning()
      .execute();

    // 3. Create audit record
    await this.auditService.logAction({
      action: 'update',
      entity: 'leave_balance',
      entityId: leaveBalance.id,
      details: `Leave balance updated for employee ${employeeId} for leave type ${leaveTypeId} for year ${year}`,
      userId,
      changes: {
        used: leaveBalance.used + totalLeaveDays,
        balance: (
          Number(leaveBalance.balance) - Number(totalLeaveDays)
        ).toString(),
      },
    });

    // 4. Send notification

    // 5. Return updated leave balance
    return updatedLeaveBalance;
  }
}
