import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { appraisals } from './schema/performance-appraisals.schema';
import {
  competencyLevels,
  employees,
  jobRoles,
  performanceCompetencies,
  roleCompetencyExpectations,
} from 'src/drizzle/schema';
import { appraisalEntries } from './schema/performance-appraisals-entries.schema';
import { UpsertEntryDto } from './dto/upsert-entry.dto';
import { AuditService } from 'src/modules/audit/audit.service';

@Injectable()
export class AppraisalEntriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async getAppraisalEntriesWithExpectations(appraisalId: string) {
    // 1) Appraisal → employee
    const [appraisal] = await this.db
      .select({ employeeId: appraisals.employeeId })
      .from(appraisals)
      .where(eq(appraisals.id, appraisalId))
      .limit(1)
      .execute();

    if (!appraisal) throw new NotFoundException('Appraisal not found');

    // 2) Employee → role
    const [employee] = await this.db
      .select({ roleId: employees.jobRoleId, roleName: jobRoles.title })
      .from(employees)
      .innerJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .where(eq(employees.id, appraisal.employeeId))
      .limit(1)
      .execute();

    if (!employee || !employee.roleId) {
      throw new NotFoundException('Employee role not assigned');
    }

    // 3) Role expectations
    const expectations = await this.db
      .select({
        competencyId: roleCompetencyExpectations.competencyId,
        expectedLevelId: roleCompetencyExpectations.expectedLevelId,
        competencyName: performanceCompetencies.name,
        expectedLevelName: competencyLevels.name,
      })
      .from(roleCompetencyExpectations)
      .innerJoin(
        performanceCompetencies,
        eq(roleCompetencyExpectations.competencyId, performanceCompetencies.id),
      )
      .innerJoin(
        competencyLevels,
        eq(roleCompetencyExpectations.expectedLevelId, competencyLevels.id),
      )
      .where(eq(roleCompetencyExpectations.roleId, employee.roleId));

    // 4) Existing entries
    const entries = await this.db
      .select({
        competencyId: appraisalEntries.competencyId,
        employeeLevelId: appraisalEntries.employeeLevelId,
        managerLevelId: appraisalEntries.managerLevelId,
        notes: appraisalEntries.notes,
      })
      .from(appraisalEntries)
      .where(eq(appraisalEntries.appraisalId, appraisalId));

    // 5) Resolve level names for present levels
    const levelIds = new Set<string>();
    for (const e of entries) {
      if (e.employeeLevelId) levelIds.add(e.employeeLevelId);
      if (e.managerLevelId) levelIds.add(e.managerLevelId);
    }
    const levelList = levelIds.size
      ? await this.db
          .select({ id: competencyLevels.id, name: competencyLevels.name })
          .from(competencyLevels)
          .where(inArray(competencyLevels.id, Array.from(levelIds)))
      : [];
    const levelMap = new Map(levelList.map((l) => [l.id, l.name]));

    // 6) Merge
    const entryByComp = new Map(entries.map((e) => [e.competencyId, e]));

    return expectations.map((exp) => {
      const entry = entryByComp.get(exp.competencyId);
      const employeeLevelId = entry?.employeeLevelId ?? null;
      const managerLevelId = entry?.managerLevelId ?? null;

      return {
        competencyId: exp.competencyId,
        competencyName: exp.competencyName,
        expectedLevelId: exp.expectedLevelId,
        expectedLevelName: exp.expectedLevelName,
        employeeLevelId,
        employeeLevelName: employeeLevelId
          ? (levelMap.get(employeeLevelId) ?? null)
          : null,
        managerLevelId,
        managerLevelName: managerLevelId
          ? (levelMap.get(managerLevelId) ?? null)
          : null,
        notes: entry?.notes ?? '',
      };
    });
  }

  async upsertEntry(dto: UpsertEntryDto, appraisalId: string, user: User) {
    const existing = await this.db
      .select({ competencyId: appraisalEntries.competencyId })
      .from(appraisalEntries)
      .where(
        and(
          eq(appraisalEntries.appraisalId, appraisalId),
          eq(appraisalEntries.competencyId, dto.competencyId),
        ),
      )
      .execute();

    if (existing.length) {
      const [updated] = await this.db
        .update(appraisalEntries)
        .set({
          employeeLevelId: dto.employeeLevelId ?? null,
          managerLevelId: dto.managerLevelId ?? null,
          notes: dto.notes ?? null,
        })
        .where(
          and(
            eq(appraisalEntries.appraisalId, appraisalId),
            eq(appraisalEntries.competencyId, dto.competencyId),
          ),
        )
        .returning();

      const status = await this.recalculateAppraisalStatus(appraisalId);

      // 🔏 Audit
      await this.auditService.logAction({
        action: 'update',
        entity: 'performance_appraisal_entry',
        entityId: `${appraisalId}:${dto.competencyId}`,
        userId: user.id,
        details: `Updated appraisal entry`,
        changes: {
          appraisalId,
          competencyId: dto.competencyId,
          employeeLevelId: dto.employeeLevelId ?? null,
          managerLevelId: dto.managerLevelId ?? null,
          notes: dto.notes ?? null,
          status,
        },
      });

      return { message: 'Entry updated', data: updated, status };
    }

    const [created] = await this.db
      .insert(appraisalEntries)
      .values({
        appraisalId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId ?? null,
        employeeLevelId: dto.employeeLevelId ?? null,
        managerLevelId: dto.managerLevelId ?? null,
        notes: dto.notes ?? null,
      })
      .returning();

    const status = await this.recalculateAppraisalStatus(appraisalId);

    // 🔏 Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_appraisal_entry',
      entityId: `${appraisalId}:${dto.competencyId}`,
      userId: user.id,
      details: `Created appraisal entry`,
      changes: {
        appraisalId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId ?? null,
        employeeLevelId: dto.employeeLevelId ?? null,
        managerLevelId: dto.managerLevelId ?? null,
        notes: dto.notes ?? null,
        status,
      },
    });

    return { message: 'Entry created', data: created, status };
  }

  async upsertEntries(
    appraisalId: string,
    entries: UpsertEntryDto[],
    user: User,
  ) {
    await this.db.transaction(async (trx) => {
      for (const dto of entries) {
        const existing = await trx
          .select({ competencyId: appraisalEntries.competencyId })
          .from(appraisalEntries)
          .where(
            and(
              eq(appraisalEntries.appraisalId, appraisalId),
              eq(appraisalEntries.competencyId, dto.competencyId),
            ),
          );

        if (existing.length) {
          await trx
            .update(appraisalEntries)
            .set({
              employeeLevelId: dto.employeeLevelId ?? null,
              managerLevelId: dto.managerLevelId ?? null,
              notes: dto.notes ?? null,
            })
            .where(
              and(
                eq(appraisalEntries.appraisalId, appraisalId),
                eq(appraisalEntries.competencyId, dto.competencyId),
              ),
            );
        } else {
          await trx.insert(appraisalEntries).values({
            appraisalId,
            competencyId: dto.competencyId,
            expectedLevelId: dto.expectedLevelId ?? null,
            employeeLevelId: dto.employeeLevelId ?? null,
            managerLevelId: dto.managerLevelId ?? null,
            notes: dto.notes ?? null,
          });
        }
      }
    });

    const status = await this.recalculateAppraisalStatus(appraisalId);

    // 🔏 Audit
    await this.auditService.logAction({
      action: 'bulk_upsert',
      entity: 'performance_appraisal_entry',
      entityId: appraisalId,
      userId: user.id,
      details: `Bulk upsert appraisal entries`,
      changes: {
        appraisalId,
        count: entries.length,
        competencyIds: entries.map((e) => e.competencyId),
        status,
      },
    });

    return { message: 'Batch upsert complete', count: entries.length, status };
  }

  /**
   * Recalculate submitted/finalized flags based on role expectations.
   * - submittedByEmployee = every expected competency has an employeeLevelId
   * - submittedByManager = every expected competency has a managerLevelId
   * - finalized = both submitted flags are true
   */
  private async recalculateAppraisalStatus(appraisalId: string) {
    // A) Load appraisal → employee → role
    const [appr] = await this.db
      .select({
        employeeId: appraisals.employeeId,
      })
      .from(appraisals)
      .where(eq(appraisals.id, appraisalId));
    if (!appr) throw new NotFoundException('Appraisal not found');

    const [emp] = await this.db
      .select({ roleId: employees.jobRoleId })
      .from(employees)
      .where(eq(employees.id, appr.employeeId))
      .limit(1);
    if (!emp?.roleId) {
      await this.db
        .update(appraisals)
        .set({
          submittedByEmployee: false,
          submittedByManager: false,
          finalized: false,
        })
        .where(eq(appraisals.id, appraisalId));
      return {
        submittedByEmployee: false,
        submittedByManager: false,
        finalized: false,
      };
    }

    // B) Expected competencies for this role
    const expectedComps = await this.db
      .select({ competencyId: roleCompetencyExpectations.competencyId })
      .from(roleCompetencyExpectations)
      .where(eq(roleCompetencyExpectations.roleId, emp.roleId));
    const expectedIds = expectedComps.map((c) => c.competencyId);

    if (expectedIds.length === 0) {
      await this.db
        .update(appraisals)
        .set({
          submittedByEmployee: false,
          submittedByManager: false,
          finalized: false,
        })
        .where(eq(appraisals.id, appraisalId));
      return {
        submittedByEmployee: false,
        submittedByManager: false,
        finalized: false,
      };
    }

    // C) Entries for the expected set
    const rows = await this.db
      .select({
        competencyId: appraisalEntries.competencyId,
        employeeLevelId: appraisalEntries.employeeLevelId,
        managerLevelId: appraisalEntries.managerLevelId,
      })
      .from(appraisalEntries)
      .where(
        and(
          eq(appraisalEntries.appraisalId, appraisalId),
          inArray(appraisalEntries.competencyId, expectedIds),
        ),
      );

    const entryByComp = new Map(rows.map((r) => [r.competencyId, r]));
    const employeeDone = expectedIds.every(
      (id) => !!entryByComp.get(id)?.employeeLevelId,
    );
    const managerDone = expectedIds.every(
      (id) => !!entryByComp.get(id)?.managerLevelId,
    );
    const finalized = employeeDone && managerDone;

    await this.db
      .update(appraisals)
      .set({
        submittedByEmployee: employeeDone,
        submittedByManager: managerDone,
        finalized,
      })
      .where(eq(appraisals.id, appraisalId));

    return {
      submittedByEmployee: employeeDone,
      submittedByManager: managerDone,
      finalized,
    };
  }
}
