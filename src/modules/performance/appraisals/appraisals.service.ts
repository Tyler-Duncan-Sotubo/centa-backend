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

@Injectable()
export class AppraisalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async create(
    createDto: CreateAppraisalDto,
    companyId: string,
    userId?: string,
  ) {
    const [employee] = await this.db
      .select({ managerId: employees.managerId })
      .from(employees)
      .where(eq(employees.id, createDto.employeeId));

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${createDto.employeeId} not found`,
      );
    }

    let managerId = employee.managerId;

    // Fallback to default manager from company settings
    if (!managerId) {
      const { defaultManager } =
        await this.companySettingsService.getDefaultManager(companyId);

      if (!defaultManager) {
        throw new BadRequestException(
          `No manager assigned to employee ${createDto.employeeId} and no default manager configured in company settings`,
        );
      }

      managerId = defaultManager;
    }

    if (!managerId || !isUuid(managerId)) {
      managerId = 'b81c481b-a849-4a25-a310-b0e53818a8cf';
    }

    // Check if appraisal already exists
    const existing = await this.db
      .select()
      .from(appraisals)
      .where(
        and(
          eq(appraisals.employeeId, createDto.employeeId),
          eq(appraisals.cycleId, createDto.cycleId),
        ),
      );

    if (existing.length > 0) {
      throw new BadRequestException(
        'An appraisal already exists for this employee in the cycle',
      );
    }

    const [created] = await this.db
      .insert(appraisals)
      .values({
        ...createDto,
        companyId,
        managerId,
      })
      .returning();

    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_appraisal',
        entityId: created.id,
        userId,
        details: `Created appraisal for employee ${created.employeeId}`,
        changes: {
          ...createDto,
          managerId,
        },
      });
    }

    return created;
  }

  async findAll(companyId: string, cycleId: string) {
    const emp = alias(employees, 'emp') as unknown as typeof employees;
    const mgr = alias(employees, 'mgr') as unknown as typeof employees;

    return this.db
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
      .orderBy(desc(appraisals.createdAt));
  }

  async findDashboardForEmployee(companyId: string, employeeId: string) {
    // Active cycle
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
      .limit(1);

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
      .orderBy(desc(appraisals.createdAt));

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
        .limit(1);
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
  }

  async findOne(id: string, companyId: string) {
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
      })
      .from(appraisals)
      .leftJoin(emp, eq(appraisals.employeeId, emp.id))
      .leftJoin(mgr, eq(appraisals.managerId, mgr.id))
      .leftJoin(departments, eq(emp.departmentId, departments.id))
      .leftJoin(jobRoles, eq(emp.jobRoleId, jobRoles.id))
      .where(and(eq(appraisals.companyId, companyId), eq(appraisals.id, id)))
      .orderBy(desc(appraisals.createdAt));

    if (!record) {
      throw new NotFoundException(`Appraisal with ID ${id} not found`);
    }

    console.log('Fetched Appraisal Record:', record);
    return record;
  }

  async updateManager(appraisalId: string, newManagerId: string, user: User) {
    const { id: userId, companyId } = user;
    const [appraisal] = await this.db
      .select()
      .from(appraisals)
      .where(
        and(
          eq(appraisals.id, appraisalId),
          eq(appraisals.companyId, companyId),
        ),
      );

    if (!appraisal) {
      throw new NotFoundException(`Appraisal with ID ${appraisalId} not found`);
    }

    const [updated] = await this.db
      .update(appraisals)
      .set({ managerId: newManagerId })
      .where(eq(appraisals.id, appraisalId))
      .returning();

    if (userId) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'performance_appraisal',
        entityId: appraisalId,
        userId,
        details: `Updated manager for appraisal ${appraisalId}`,
        changes: {
          previousManagerId: appraisal.managerId,
          newManagerId,
        },
      });
    }
    return updated;
  }

  async update(id: string, updateDto: UpdateAppraisalDto, user: User) {
    await this.findOne(id, user.companyId); // validates + warms cache

    const [updated] = await this.db
      .update(appraisals)
      .set(updateDto)
      .where(
        and(eq(appraisals.id, id), eq(appraisals.companyId, user.companyId)),
      )
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_appraisal',
      entityId: id,
      userId: user.id,
      details: `Updated appraisal ${id}`,
      changes: {
        ...updateDto,
        updatedAt: new Date().toISOString(),
      },
    });
    return updated;
  }

  async remove(id: string, user: User) {
    const appraisal = await this.findOne(id, user.companyId);

    const isStarted =
      appraisal.submittedByEmployee ||
      appraisal.submittedByManager ||
      appraisal.finalized;

    if (isStarted) {
      throw new BadRequestException(
        'Cannot delete appraisal that has already been started or finalized',
      );
    }

    await this.db
      .delete(appraisals)
      .where(
        and(eq(appraisals.id, id), eq(appraisals.companyId, user.companyId)),
      );

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_appraisal',
      entityId: id,
      userId: user.id,
      details: `Deleted not-started appraisal ${id}`,
      changes: { deletedAt: new Date().toISOString() },
    });

    return { message: 'Appraisal deleted successfully' };
  }

  async restartAppraisal(appraisalId: string, user: User) {
    const existing = await this.db
      .select({ id: appraisals.id, companyId: appraisals.companyId })
      .from(appraisals)
      .where(eq(appraisals.id, appraisalId));

    // ✅ fix: check array length, not truthiness
    if (existing.length === 0) {
      throw new NotFoundException('Appraisal not found');
    }

    // 1) Delete associated entries
    await this.db
      .delete(appraisalEntries)
      .where(eq(appraisalEntries.appraisalId, appraisalId));

    // 2) Reset appraisal metadata
    await this.db
      .update(appraisals)
      .set({
        submittedByEmployee: false,
        submittedByManager: false,
        finalized: false,
        finalScore: null,
      })
      .where(eq(appraisals.id, appraisalId));

    // 3) Audit
    await this.auditService.logAction({
      action: 'RESTART_APPRAISAL',
      entityId: appraisalId,
      entity: 'performance_appraisal',
      userId: user.id,
      details: `Restarted appraisal ${appraisalId}`,
      changes: { resetAt: new Date().toISOString() },
    });

    return { message: 'Appraisal restarted successfully' };
  }

  async sendReminder(employeeId: string) {
    console.log(employeeId);
    // TODO send reminder via email, push notifications
  }
}
