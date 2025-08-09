import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { leaveBalances } from '../schema/leave-balance.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { departments, employees, jobRoles } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeaveBalanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(LeaveBalanceService.name);
  }

  protected table = leaveBalances;

  // ------------- cache keys & bursters -------------
  private allKey(companyId: string) {
    return `company:${companyId}:leaveBalances:all-agg`;
  }
  private empYearKey(employeeId: string, year: number) {
    return `emp:${employeeId}:leaveBalances:year:${year}`;
  }
  private empTypeYearKey(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ) {
    return `company:${companyId}:emp:${employeeId}:leaveType:${leaveTypeId}:year:${year}`;
  }

  private async burstAfterChange(opts: {
    companyId: string;
    employeeId?: string;
    leaveTypeId?: string;
    year?: number;
  }) {
    const jobs: Promise<any>[] = [];
    jobs.push(this.cache.del(this.allKey(opts.companyId)));
    if (opts.employeeId && opts.year != null) {
      jobs.push(this.cache.del(this.empYearKey(opts.employeeId, opts.year)));
    }
    if (
      opts.companyId &&
      opts.employeeId &&
      opts.leaveTypeId &&
      opts.year != null
    ) {
      jobs.push(
        this.cache.del(
          this.empTypeYearKey(
            opts.companyId,
            opts.employeeId,
            opts.leaveTypeId,
            opts.year,
          ),
        ),
      );
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:leave-balance');
  }

  // ------------- create -------------
  async create(
    leaveTypeId: string,
    companyId: string,
    employeeId: string,
    year: number,
    entitlement: string,
    used: string,
    balance: string,
  ) {
    this.logger.info(
      { companyId, employeeId, leaveTypeId, year },
      'leaveBalance:create:start',
    );

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

    await this.burstAfterChange({ companyId, employeeId, leaveTypeId, year });
    this.logger.info({ id: leaveBalance[0]?.id }, 'leaveBalance:create:done');
    return leaveBalance;
  }

  // ------------- list (aggregated per employee) -------------
  async findAll(companyId: string) {
    const key = this.allKey(companyId);
    this.logger.debug({ companyId, key }, 'leaveBalance:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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

      this.logger.debug(
        { companyId, count: results.length },
        'leaveBalance:findAll:db:done',
      );
      return results;
    });
  }

  // ------------- per-employee current year -------------
  async findByEmployeeId(employeeId: string) {
    const currentYear = new Date().getFullYear();
    const key = this.empYearKey(employeeId, currentYear);
    this.logger.debug(
      { employeeId, currentYear, key },
      'leaveBalance:findByEmployeeId:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
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

      this.logger.debug(
        { employeeId, count: results.length },
        'leaveBalance:findByEmployeeId:db:done',
      );
      return results;
    });
  }

  // ------------- specific leave type -------------
  async findBalanceByLeaveType(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    currentYear: number,
  ) {
    const key = this.empTypeYearKey(
      companyId,
      employeeId,
      leaveTypeId,
      currentYear,
    );
    this.logger.debug(
      { companyId, employeeId, leaveTypeId, currentYear, key },
      'leaveBalance:findByType:cache:get',
    );

    // cache nulls only briefly if your CacheService supports TTL; otherwise don't cache negatives.
    const row = await this.cache.getOrSetCache(key, async () => {
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
        .execute(); // <== missing in original

      return balance ?? null;
    });

    if (!row) {
      this.logger.warn(
        { companyId, employeeId, leaveTypeId, currentYear },
        'leaveBalance:findByType:not-found',
      );
      return null;
    }
    return row;
  }

  // ------------- update by id -------------
  async update(balanceId: string, dto: UpdateLeaveBalanceDto) {
    this.logger.info({ balanceId }, 'leaveBalance:update:start');

    const existingLeaveBalance = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, balanceId))
      .execute();

    if (existingLeaveBalance.length === 0) {
      this.logger.warn({ balanceId }, 'leaveBalance:update:not-found');
      throw new NotFoundException(`Leave balance not found`);
    }

    const [updatedLeaveBalance] = await this.db
      .update(this.table)
      .set(dto)
      .where(eq(this.table.id, balanceId))
      .returning()
      .execute();

    await this.burstAfterChange({
      companyId: updatedLeaveBalance.companyId,
      employeeId: updatedLeaveBalance.employeeId,
      leaveTypeId: updatedLeaveBalance.leaveTypeId,
      year: updatedLeaveBalance.year,
    });

    this.logger.info({ balanceId }, 'leaveBalance:update:done');
    return updatedLeaveBalance;
  }

  // ------------- adjust on approval -------------
  async updateLeaveBalanceOnLeaveApproval(
    leaveTypeId: string,
    employeeId: string,
    year: number,
    totalLeaveDays: string,
    userId: string,
  ) {
    this.logger.info(
      { employeeId, leaveTypeId, year, totalLeaveDays },
      'leaveBalance:onApproval:start',
    );

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
      this.logger.warn(
        { employeeId, leaveTypeId, year },
        'leaveBalance:onApproval:not-found',
      );
      throw new NotFoundException(`Leave balance not found`);
    }

    const usedNum = Number(leaveBalance.used);
    const daysNum = Number(totalLeaveDays);
    const balNum = Number(leaveBalance.balance);

    const updatedUsed = usedNum + daysNum;
    const updatedBalance = balNum - daysNum;

    const [updated] = await this.db
      .update(this.table)
      .set({
        used: updatedUsed.toFixed(2),
        balance: updatedBalance.toFixed(2),
      })
      .where(eq(this.table.id, leaveBalance.id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'leave_balance',
      entityId: leaveBalance.id,
      details: `Leave balance updated for employee ${employeeId} for leave type ${leaveTypeId} for year ${year}`,
      userId,
      changes: {
        used: updated.used,
        balance: updated.balance,
      },
    });

    await this.burstAfterChange({
      companyId: updated.companyId,
      employeeId,
      leaveTypeId,
      year,
    });

    this.logger.info(
      { id: updated.id, employeeId, leaveTypeId, year },
      'leaveBalance:onApproval:done',
    );
    return updated;
  }
}
