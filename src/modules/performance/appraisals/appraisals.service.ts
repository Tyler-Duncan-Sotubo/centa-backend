import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { appraisals } from './schema/performance-appraisals.schema';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { UpdateAppraisalDto } from './dto/update-appraisal.dto';
import { departments, employees, jobRoles } from 'src/drizzle/schema';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { validate as isUuid } from 'uuid';
import { alias } from 'drizzle-orm/pg-core';
import { appraisalEntries } from './schema/performance-appraisals-entries.schema';
import { performanceAppraisalCycles } from './schema/performance-appraisal-cycle.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AppraisalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(AppraisalsService.name);
  }

  // ---------- cache keys ----------
  private oneKey(id: string) {
    return `appraisals:${id}:detail`;
  }
  private listKey(companyId: string, cycleId: string) {
    return `appraisals:${companyId}:cycle:${cycleId}:list`;
  }
  private dashboardKey(companyId: string, employeeId: string) {
    return `appraisals:${companyId}:employee:${employeeId}:dashboard`;
  }

  private async burst(opts: {
    appraisalId?: string;
    companyId?: string;
    cycleId?: string;
    employeeId?: string;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.appraisalId)
      jobs.push(this.cache.del(this.oneKey(opts.appraisalId)));
    if (opts.companyId && opts.cycleId)
      jobs.push(this.cache.del(this.listKey(opts.companyId, opts.cycleId)));
    if (opts.companyId && opts.employeeId)
      jobs.push(
        this.cache.del(this.dashboardKey(opts.companyId, opts.employeeId)),
      );
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:appraisals');
  }

  // ---------- commands ----------
  async create(
    createDto: CreateAppraisalDto,
    companyId: string,
    userId?: string,
  ) {
    this.logger.info(
      {
        companyId,
        employeeId: createDto.employeeId,
        cycleId: createDto.cycleId,
      },
      'appraisals:create:start',
    );

    const [employee] = await this.db
      .select({ managerId: employees.managerId })
      .from(employees)
      .where(eq(employees.id, createDto.employeeId))
      .execute();

    if (!employee) {
      this.logger.warn(
        { employeeId: createDto.employeeId },
        'appraisals:create:no-employee',
      );
      throw new NotFoundException(
        `Employee with ID ${createDto.employeeId} not found`,
      );
    }

    let managerId = employee.managerId;

    if (!managerId) {
      const { defaultManager } =
        await this.companySettingsService.getDefaultManager(companyId);
      if (!defaultManager) {
        this.logger.warn(
          { employeeId: createDto.employeeId },
          'appraisals:create:no-manager-default',
        );
        throw new BadRequestException(
          `No manager assigned to employee ${createDto.employeeId} and no default manager configured in company settings`,
        );
      }
      managerId = defaultManager;
    }

    if (!managerId || !isUuid(managerId)) {
      // TODO: handle properly later
      managerId = 'b81c481b-a849-4a25-a310-b0e53818a8cf';
    }

    const existing = await this.db
      .select()
      .from(appraisals)
      .where(
        and(
          eq(appraisals.employeeId, createDto.employeeId),
          eq(appraisals.cycleId, createDto.cycleId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      this.logger.warn(
        { employeeId: createDto.employeeId, cycleId: createDto.cycleId },
        'appraisals:create:duplicate',
      );
      throw new BadRequestException(
        'An appraisal already exists for this employee in the cycle',
      );
    }

    const [created] = await this.db
      .insert(appraisals)
      .values({ ...createDto, companyId, managerId })
      .returning()
      .execute();

    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_appraisal',
        entityId: created.id,
        userId,
        details: `Created appraisal for employee ${created.employeeId}`,
        changes: { ...createDto, managerId },
      });
    }

    await this.burst({
      companyId,
      cycleId: createDto.cycleId,
      employeeId: createDto.employeeId,
      appraisalId: created.id,
    });
    this.logger.info({ id: created.id }, 'appraisals:create:done');
    return created;
  }

  // ---------- queries (cached) ----------
  async findAll(companyId: string, cycleId: string) {
    const key = this.listKey(companyId, cycleId);
    this.logger.debug({ key, companyId, cycleId }, 'appraisals:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const emp = alias(employees, 'emp') as unknown as typeof employees;
      const mgr = alias(employees, 'mgr') as unknown as typeof employees;

      const rows = await this.db
        .select({
          id: appraisals.id,
          employeeName: sql<string>`CONCAT(${emp.firstName}, ' ', ${emp.lastName})`,
          managerName: sql<string>`CONCAT(${mgr.firstName}, ' ', ${mgr.lastName})`,
          submittedByEmployee: appraisals.submittedByEmployee,
          submittedByManager: appraisals.submittedByManager,
          finalized: appraisals.finalized,
          finalScore: appraisals.finalScore,
          departmentName: departments.name,
          jobRoleName: jobRoles.title,
        })
        .from(appraisals)
        .leftJoin(emp, eq(appraisals.employeeId, emp.id))
        .leftJoin(mgr, eq(appraisals.managerId, mgr.id))
        .leftJoin(departments, eq(emp.departmentId, departments.id))
        .leftJoin(jobRoles, eq(emp.jobRoleId, jobRoles.id))
        .where(
          and(
            eq(appraisals.companyId, companyId),
            eq(appraisals.cycleId, cycleId),
          ),
        )
        .orderBy(desc(appraisals.createdAt))
        .execute();

      this.logger.debug(
        { companyId, cycleId, count: rows.length },
        'appraisals:list:db:done',
      );
      return rows;
    });
  }

  async findDashboardForEmployee(companyId: string, employeeId: string) {
    const key = this.dashboardKey(companyId, employeeId);
    this.logger.debug(
      { key, companyId, employeeId },
      'appraisals:dashboard:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const [activeCycle] = await this.db
        .select({
          id: performanceAppraisalCycles.id,
          name: performanceAppraisalCycles.name,
          startDate: performanceAppraisalCycles.startDate,
          endDate: performanceAppraisalCycles.endDate,
          status: performanceAppraisalCycles.status,
        })
        .from(performanceAppraisalCycles)
        .where(
          and(
            eq(performanceAppraisalCycles.companyId, companyId),
            eq(performanceAppraisalCycles.status, 'active'),
          ),
        )
        .limit(1)
        .execute();

      const emp = alias(employees, 'emp') as unknown as typeof employees;
      const mgr = alias(employees, 'mgr') as unknown as typeof employees;

      const rows = await this.db
        .select({
          id: appraisals.id,
          cycleId: appraisals.cycleId,
          cycleName: performanceAppraisalCycles.name,
          createdAt: appraisals.createdAt,
          submittedByEmployee: appraisals.submittedByEmployee,
          submittedByManager: appraisals.submittedByManager,
          finalized: appraisals.finalized,
          finalScore: appraisals.finalScore,
          employeeName: sql<string>`concat(${emp.firstName}, ' ', ${emp.lastName})`,
          managerName: sql<string>`concat(${mgr.firstName}, ' ', ${mgr.lastName})`,
          departmentName: departments.name,
          jobRoleName: jobRoles.title,
        })
        .from(appraisals)
        .leftJoin(
          performanceAppraisalCycles,
          eq(performanceAppraisalCycles.id, appraisals.cycleId),
        )
        .leftJoin(emp, eq(emp.id, appraisals.employeeId))
        .leftJoin(mgr, eq(mgr.id, appraisals.managerId))
        .leftJoin(departments, eq(departments.id, emp.departmentId))
        .leftJoin(jobRoles, eq(jobRoles.id, emp.jobRoleId))
        .where(
          and(
            eq(appraisals.companyId, companyId),
            eq(appraisals.employeeId, employeeId),
          ),
        )
        .orderBy(desc(appraisals.createdAt))
        .execute();

      let currentCycleAppraisal: {
        id: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        finalScore: number | null;
      } | null = null;
      if (activeCycle) {
        const [curr] = await this.db
          .select({
            id: appraisals.id,
            submittedByEmployee: appraisals.submittedByEmployee,
            submittedByManager: appraisals.submittedByManager,
            finalized: appraisals.finalized,
            finalScore: appraisals.finalScore,
          })
          .from(appraisals)
          .where(
            and(
              eq(appraisals.companyId, companyId),
              eq(appraisals.employeeId, employeeId),
              eq(appraisals.cycleId, activeCycle.id),
            ),
          )
          .limit(1)
          .execute();
        currentCycleAppraisal = curr ?? null;
      }

      return {
        currentCycle: activeCycle
          ? {
              id: activeCycle.id,
              name: activeCycle.name,
              startDate: activeCycle.startDate,
              endDate: activeCycle.endDate,
              status: activeCycle.status,
            }
          : null,
        currentCycleAppraisal,
        history: rows.map((r) => ({
          id: r.id,
          cycleId: r.cycleId,
          cycleName: r.cycleName ?? null,
          createdAt: r.createdAt,
          submittedByEmployee: r.submittedByEmployee,
          submittedByManager: r.submittedByManager,
          finalized: r.finalized,
          finalScore: r.finalScore,
          employeeName: r.employeeName,
          managerName: r.managerName ?? null,
          departmentName: r.departmentName ?? null,
          jobRoleName: r.jobRoleName ?? null,
        })),
      };
    });
  }

  async findOne(id: string, companyId: string) {
    const key = this.oneKey(id);
    this.logger.debug({ key, id, companyId }, 'appraisals:detail:cache:get');

    const row = await this.cache.getOrSetCache(key, async () => {
      const emp = alias(employees, 'emp') as unknown as typeof employees;
      const mgr = alias(employees, 'mgr') as unknown as typeof employees;
      const [record] = await this.db
        .select({
          id: appraisals.id,
          cycleId: appraisals.cycleId,
          employeeName: sql<string>`CONCAT(${emp.firstName}, ' ', ${emp.lastName})`,
          managerName: sql<string>`CONCAT(${mgr.firstName}, ' ', ${mgr.lastName})`,
          submittedByEmployee: appraisals.submittedByEmployee,
          submittedByManager: appraisals.submittedByManager,
          finalized: appraisals.finalized,
          recommendation: appraisals.promotionRecommendation,
          finalNote: appraisals.finalNote,
          finalScore: appraisals.finalScore,
          departmentName: departments.name,
          jobRoleName: jobRoles.title,
          employeeId: appraisals.employeeId,
          companyId: appraisals.companyId,
        })
        .from(appraisals)
        .leftJoin(emp, eq(appraisals.employeeId, emp.id))
        .leftJoin(mgr, eq(appraisals.managerId, mgr.id))
        .leftJoin(departments, eq(emp.departmentId, departments.id))
        .leftJoin(jobRoles, eq(emp.jobRoleId, jobRoles.id))
        .where(and(eq(appraisals.companyId, companyId), eq(appraisals.id, id)))
        .orderBy(desc(appraisals.createdAt))
        .execute();
      return record ?? null;
    });

    if (!row) {
      this.logger.warn({ id, companyId }, 'appraisals:detail:not-found');
      throw new NotFoundException(`Appraisal with ID ${id} not found`);
    }

    // do not leak companyId/employeeId in final payload if not desired
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { companyId: _c, employeeId: _e, ...safe } = row as any;
    return safe;
  }

  // ---------- mutations ----------
  async updateManager(appraisalId: string, newManagerId: string, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info(
      { appraisalId, newManagerId, userId },
      'appraisals:updateManager:start',
    );

    const [appraisal] = await this.db
      .select({
        id: appraisals.id,
        employeeId: appraisals.employeeId,
        cycleId: appraisals.cycleId,
      })
      .from(appraisals)
      .where(
        and(
          eq(appraisals.id, appraisalId),
          eq(appraisals.companyId, companyId),
        ),
      )
      .execute();

    if (!appraisal) {
      this.logger.warn({ appraisalId }, 'appraisals:updateManager:not-found');
      throw new NotFoundException(`Appraisal with ID ${appraisalId} not found`);
    }

    const [updated] = await this.db
      .update(appraisals)
      .set({ managerId: newManagerId })
      .where(eq(appraisals.id, appraisalId))
      .returning()
      .execute();

    if (userId) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'performance_appraisal',
        entityId: appraisalId,
        userId,
        details: `Updated manager for appraisal ${appraisalId}`,
        changes: {
          previousManagerId: (appraisal as any).managerId,
          newManagerId,
        },
      });
    }

    await this.burst({
      appraisalId,
      companyId,
      cycleId: appraisal.cycleId,
      employeeId: appraisal.employeeId,
    });
    this.logger.info({ appraisalId }, 'appraisals:updateManager:done');
    return updated;
  }

  async update(id: string, updateDto: UpdateAppraisalDto, user: User) {
    this.logger.info({ id, userId: user.id }, 'appraisals:update:start');
    const current = await this.findOne(id, user.companyId); // validates

    const [updated] = await this.db
      .update(appraisals)
      .set(updateDto)
      .where(
        and(eq(appraisals.id, id), eq(appraisals.companyId, user.companyId)),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_appraisal',
      entityId: id,
      userId: user.id,
      details: `Updated appraisal ${id}`,
      changes: { ...updateDto, updatedAt: new Date().toISOString() },
    });

    await this.burst({
      appraisalId: id,
      companyId: user.companyId,
      cycleId: (current as any).cycleId,
      employeeId: (current as any).employeeId,
    });
    this.logger.info({ id }, 'appraisals:update:done');
    return updated;
  }

  async remove(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'appraisals:remove:start');
    const appraisal = await this.findOne(id, user.companyId);

    const isStarted =
      appraisal.submittedByEmployee ||
      appraisal.submittedByManager ||
      appraisal.finalized;
    if (isStarted) {
      this.logger.warn({ id }, 'appraisals:remove:started');
      throw new BadRequestException(
        'Cannot delete appraisal that has already been started or finalized',
      );
    }

    await this.db
      .delete(appraisals)
      .where(
        and(eq(appraisals.id, id), eq(appraisals.companyId, user.companyId)),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_appraisal',
      entityId: id,
      userId: user.id,
      details: `Deleted not-started appraisal ${id}`,
      changes: { deletedAt: new Date().toISOString() },
    });

    await this.burst({
      appraisalId: id,
      companyId: user.companyId,
      cycleId: (appraisal as any).cycleId,
      employeeId: (appraisal as any).employeeId,
    });
    this.logger.info({ id }, 'appraisals:remove:done');
    return { message: 'Appraisal deleted successfully' };
  }

  async restartAppraisal(appraisalId: string, user: User) {
    this.logger.info(
      { appraisalId, userId: user.id },
      'appraisals:restart:start',
    );

    const [existing] = await this.db
      .select({
        id: appraisals.id,
        employeeId: appraisals.employeeId,
        cycleId: appraisals.cycleId,
      })
      .from(appraisals)
      .where(eq(appraisals.id, appraisalId))
      .execute();

    if (!existing) {
      this.logger.warn({ appraisalId }, 'appraisals:restart:not-found');
      throw new NotFoundException('Appraisal not found');
    }

    await this.db
      .delete(appraisalEntries)
      .where(eq(appraisalEntries.appraisalId, appraisalId))
      .execute();

    await this.db
      .update(appraisals)
      .set({
        submittedByEmployee: false,
        submittedByManager: false,
        finalized: false,
        finalScore: null,
      })
      .where(eq(appraisals.id, appraisalId))
      .execute();

    await this.auditService.logAction({
      action: 'RESTART_APPRAISAL',
      entityId: appraisalId,
      entity: 'performance_appraisal',
      userId: user.id,
      details: `Restarted appraisal ${appraisalId}`,
      changes: { resetAt: new Date().toISOString() },
    });

    await this.burst({
      appraisalId,
      companyId: user.companyId,
      cycleId: existing.cycleId,
      employeeId: existing.employeeId,
    });
    this.logger.info({ appraisalId }, 'appraisals:restart:done');
    return { message: 'Appraisal restarted successfully' };
  }
}
