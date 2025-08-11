import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and, or } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { roleCompetencyExpectations } from '../schema/performance-competency-role-expectations.schema';
import { CreateRoleExpectationDto } from './dto/create-role-expectation.dto';
import { UpdateRoleExpectationDto } from './dto/update-role-expectation.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { performanceCompetencies } from '../schema/performance-competencies.schema';
import { competencyLevels, jobRoles } from 'src/drizzle/schema';

@Injectable()
export class RoleCompetencyExpectationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(companyId: string, dto: CreateRoleExpectationDto, user: User) {
    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.companyId, companyId),
        eq(roleCompetencyExpectations.roleId, dto.roleId),
        eq(roleCompetencyExpectations.competencyId, dto.competencyId),
      ),
    });

    if (existing) {
      // Update instead of inserting a duplicate
      await this.db
        .update(roleCompetencyExpectations)
        .set({ expectedLevelId: dto.expectedLevelId })
        .where(eq(roleCompetencyExpectations.id, existing.id));

      await this.auditService.logAction({
        action: 'update',
        entity: 'role_competency_expectation',
        entityId: existing.id,
        userId: user.id,
        details: `Updated expectation for role: ${dto.roleId}, competency: ${dto.competencyId}`,
        changes: {
          expectedLevelId: dto.expectedLevelId,
        },
      });

      return { ...existing, expectedLevelId: dto.expectedLevelId };
    }

    // Create new expectation if it doesn't exist
    const [created] = await this.db
      .insert(roleCompetencyExpectations)
      .values({
        companyId,
        roleId: dto.roleId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId,
      })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'role_competency_expectation',
      entityId: created.id,
      userId: user.id,
      details: `Created expectation for role: ${dto.roleId}, competency: ${dto.competencyId}`,
      changes: {
        roleId: dto.roleId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId,
      },
    });

    return created;
  }

  async update(id: string, dto: UpdateRoleExpectationDto, user: User) {
    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.id, id),
        eq(roleCompetencyExpectations.companyId, user.companyId),
      ),
    });

    if (!existing) throw new NotFoundException('Expectation not found');

    await this.db
      .update(roleCompetencyExpectations)
      .set({
        roleId: dto.roleId ?? existing.roleId,
        competencyId: dto.competencyId ?? existing.competencyId,
        expectedLevelId: dto.expectedLevelId ?? existing.expectedLevelId,
      })
      .where(eq(roleCompetencyExpectations.id, id));

    await this.auditService.logAction({
      action: 'update',
      entity: 'role_competency_expectation',
      entityId: id,
      userId: user.id,
      details: `Updated expectation for role: ${existing.roleId}`,
      changes: {
        roleId: dto.roleId ?? existing.roleId,
        competencyId: dto.competencyId ?? existing.competencyId,
        expectedLevelId: dto.expectedLevelId ?? existing.expectedLevelId,
      },
    });

    return { message: 'Updated successfully' };
  }

  async delete(id: string, user: User) {
    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.id, id),
        eq(roleCompetencyExpectations.companyId, user.companyId),
      ),
    });

    if (!existing) throw new NotFoundException('Expectation not found');

    await this.db
      .delete(roleCompetencyExpectations)
      .where(eq(roleCompetencyExpectations.id, id));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'role_competency_expectation',
      entityId: id,
      userId: user.id,
      details: `Deleted expectation for role: ${existing.roleId}`,
    });

    return { message: 'Deleted successfully' };
  }

  async list(companyId: string) {
    return await this.db.query.roleCompetencyExpectations.findMany({
      where: eq(roleCompetencyExpectations.companyId, companyId),
    });
  }

  async getFrameworkSettings(companyId: string) {
    const [roles, expectations] = await Promise.all([
      this.db
        .select({
          id: jobRoles.id,
          title: jobRoles.title,
        })
        .from(jobRoles)
        .where(eq(jobRoles.companyId, companyId)),

      this.db
        .select({
          id: roleCompetencyExpectations.id,
          roleId: roleCompetencyExpectations.roleId,
          competencyId: roleCompetencyExpectations.competencyId,
          expectedLevelId: roleCompetencyExpectations.expectedLevelId,
          competencyName: performanceCompetencies.name,
          levelName: competencyLevels.name,
        })
        .from(roleCompetencyExpectations)
        .leftJoin(
          performanceCompetencies,
          eq(
            roleCompetencyExpectations.competencyId,
            performanceCompetencies.id,
          ),
        )
        .leftJoin(
          competencyLevels,
          eq(roleCompetencyExpectations.expectedLevelId, competencyLevels.id),
        )
        .where(eq(roleCompetencyExpectations.companyId, companyId)),
    ]);

    // Transform to expectationsByRole format
    const expectationsByRole: Record<
      string,
      {
        id: string;
        competencyName: string;
        levelName: string;
        competencyId: string;
      }[]
    > = {};

    for (const item of expectations) {
      if (!expectationsByRole[item.roleId]) {
        expectationsByRole[item.roleId] = [];
      }
      expectationsByRole[item.roleId].push({
        id: item.id,
        competencyName: item.competencyName ?? '',
        levelName: item.levelName ?? '',
        competencyId: item.competencyId,
      });
    }

    return {
      roles,
      expectationsByRole,
    };
  }

  async getFrameworkFields(companyId: string) {
    const competencies = await this.db
      .select({
        id: performanceCompetencies.id,
        name: performanceCompetencies.name,
      })
      .from(performanceCompetencies)
      .where(
        or(
          eq(performanceCompetencies.companyId, companyId),
          eq(performanceCompetencies.isGlobal, true),
        ),
      );

    const levels = await this.db
      .select({
        id: competencyLevels.id,
        name: competencyLevels.name,
      })
      .from(competencyLevels);

    return { competencies, levels };
  }

  async getAllCompetencyLevels() {
    return await this.db
      .select({
        id: competencyLevels.id,
        name: competencyLevels.name,
      })
      .from(competencyLevels);
  }
}
