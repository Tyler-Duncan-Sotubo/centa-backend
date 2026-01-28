import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { leaveBalances } from '../schema/leave-balance.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { departments, employees, jobRoles } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeaveBalanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  protected table = leaveBalances;

  /** cache tags for this domain */
  private tags(companyId: string) {
    return [
      `company:${companyId}:leave`,
      `company:${companyId}:leave:balances`,
    ];
  }

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

    // invalidate versioned caches for this company
    await this.cache.bumpCompanyVersion(companyId);
    return leaveBalance;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'balances', 'all'],
      async () => {
        return this.db
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
      },
      { tags: this.tags(companyId) },
    );
  }

  async findByEmployeeId(employeeId: string) {
    const currentYear = new Date().getFullYear();

    // get companyId once (for versioning + tags)
    const [emp] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .execute();
    const companyId = emp?.companyId ?? 'unknown';

    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'balances', 'by-employee', employeeId, String(currentYear)],
      async () => {
        return this.db
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
      },
      { tags: this.tags(companyId) },
    );
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
      )
      .execute();

    return balance ?? null;
  }

  async update(balanceId: string, dto: UpdateLeaveBalanceDto) {
    // 1. Ensure exists + get companyId for invalidation
    const [existing] = await this.db
      .select({ id: this.table.id, companyId: this.table.companyId })
      .from(this.table)
      .where(eq(this.table.id, balanceId))
      .execute();

    if (!existing) throw new NotFoundException(`Leave balance not found`);

    // 2. Update
    const [updatedLeaveBalance] = await this.db
      .update(this.table)
      .set(dto)
      .where(eq(this.table.id, balanceId))
      .returning()
      .execute();

    // 4. Invalidate company caches
    await this.cache.bumpCompanyVersion(existing.companyId);

    return updatedLeaveBalance;
  }

  async updateLeaveBalanceOnLeaveApproval(
    leaveTypeId: string,
    employeeId: string,
    year: number,
    totalLeaveDays: string,
    userId: string,
  ) {
    // 1. Load record
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

    // 2. Compute new values
    const usedNum = Number(leaveBalance.used) + Number(totalLeaveDays);
    const balNum = Number(leaveBalance.balance) - Number(totalLeaveDays);

    const [updatedLeaveBalance] = await this.db
      .update(this.table)
      .set({
        used: usedNum.toFixed(2),
        balance: balNum.toFixed(2),
      })
      .where(eq(this.table.id, leaveBalance.id))
      .returning()
      .execute();

    // 3. Audit
    await this.auditService.logAction({
      action: 'update',
      entity: 'leave_balance',
      entityId: leaveBalance.id,
      details: `Leave balance updated for employee ${employeeId} for leave type ${leaveTypeId} for year ${year}`,
      userId,
      changes: {
        before: {
          used: leaveBalance.used,
          balance: leaveBalance.balance,
        },
        after: {
          used: updatedLeaveBalance.used,
          balance: updatedLeaveBalance.balance,
        },
      },
    });

    // 4. Invalidate caches (use the record’s companyId)
    await this.cache.bumpCompanyVersion(leaveBalance.companyId);

    return updatedLeaveBalance;
  }
}
