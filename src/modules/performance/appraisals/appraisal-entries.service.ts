import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
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
import { performanceAppraisalCycles } from './schema/performance-appraisal-cycle.schema';

@Injectable()
export class AppraisalEntriesService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async getAppraisalEntriesWithExpectations(appraisalId: string) {
    // 1. Get appraisal
    const [appraisal] = await this.db
      .select({ employeeId: appraisals.employeeId })
      .from(appraisals)
      .where(eq(appraisals.id, appraisalId))
      .limit(1)
      .execute();

    if (!appraisal) throw new NotFoundException('Appraisal not found');

    // 2. Get employee role
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

    // 3. Expectations for this role
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

    // 4. Existing appraisal entries
    const entries = await this.db
      .select({
        competencyId: appraisalEntries.competencyId,
        employeeLevelId: appraisalEntries.employeeLevelId,
        managerLevelId: appraisalEntries.managerLevelId,
        notes: appraisalEntries.notes,
      })
      .from(appraisalEntries)
      .where(eq(appraisalEntries.appraisalId, appraisalId));

    const levelIds = new Set<string>();
    for (const entry of entries) {
      if (entry.employeeLevelId) levelIds.add(entry.employeeLevelId);
      if (entry.managerLevelId) levelIds.add(entry.managerLevelId);
    }

    // 5. Fetch level names
    const levelList = await this.db
      .select({
        id: competencyLevels.id,
        name: competencyLevels.name,
      })
      .from(competencyLevels)
      .where(inArray(competencyLevels.id, Array.from(levelIds)));

    const levelMap = new Map(levelList.map((lvl) => [lvl.id, lvl.name]));

    // 6. Merge expectations with entries
    const entriesMap = new Map(entries.map((e) => [e.competencyId, e]));

    return expectations.map((exp) => {
      const entry = entriesMap.get(exp.competencyId);
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
      .select()
      .from(appraisalEntries)
      .where(
        and(
          eq(appraisalEntries.appraisalId, appraisalId),
          eq(appraisalEntries.competencyId, dto.competencyId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      // Update existing entry
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

      return { message: 'Entry updated', data: updated, user };
    }

    // Insert new entry
    const [created] = await this.db
      .insert(appraisalEntries)
      .values({
        appraisalId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId,
        employeeLevelId: dto.employeeLevelId ?? null,
        managerLevelId: dto.managerLevelId ?? null,
        notes: dto.notes ?? null,
      })
      .returning();

    await this.db
      .update(appraisals)
      .set({
        submittedByEmployee: dto.employeeLevelId ? true : false,
        submittedByManager: dto.managerLevelId ? true : false,
        finalized: dto.employeeLevelId && dto.managerLevelId ? true : false,
      })
      .where(eq(appraisals.id, appraisalId));

    return { message: 'Entry created', data: created };
  }

  async upsertEntries(
    appraisalId: string,
    entries: UpsertEntryDto[],
    user: User,
  ) {
    const results: Array<{ message: string; data: any }> = [];

    for (const entry of entries) {
      const result = await this.upsertEntry(entry, appraisalId, user);
      results.push(result);
    }

    // Recalculate status if only entries were updated
    await this.recalculateAppraisalStatus(appraisalId);

    return {
      message: 'Batch upsert complete',
      count: results.length,
      results,
    };
  }

  private async recalculateAppraisalStatus(appraisalId: string) {
    const entries = await this.db
      .select({
        employeeLevelId: appraisalEntries.employeeLevelId,
        managerLevelId: appraisalEntries.managerLevelId,
      })
      .from(appraisalEntries)
      .where(eq(appraisalEntries.appraisalId, appraisalId));

    const allEmployeeDone =
      entries.length > 0 && entries.every((e) => e.employeeLevelId);
    const allManagerDone =
      entries.length > 0 && entries.every((e) => e.managerLevelId);

    await this.db.update(performanceAppraisalCycles).set({ status: 'active' });

    await this.db
      .update(appraisals)
      .set({
        submittedByEmployee: allEmployeeDone,
        submittedByManager: allManagerDone,
        finalized: allEmployeeDone && allManagerDone,
      })
      .where(eq(appraisals.id, appraisalId));
  }
}
