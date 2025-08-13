import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class RoleCompetencyExpectationService {
  private readonly ttlSeconds = 60 * 5; // 5 min

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ── cache helpers ───────────────────────────────────────────────────────────
  private ns(): string[] {
    return ['performance', 'role-expectations'];
  }

  private tags(companyId: string) {
    return [
      `company:${companyId}`,
      'performance',
      'performance:role-expectations',
    ];
  }
  private async bump(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // optional: no-op if not Redis native
    await this.cache.invalidateTags(this.tags(companyId));
  }

  // ── small guards (makes debugging easier) ───────────────────────────────────
  private async assertRoleInCompany(roleId: string, companyId: string) {
    const [r] = await this.db
      .select({ id: jobRoles.id })
      .from(jobRoles)
      .where(and(eq(jobRoles.id, roleId), eq(jobRoles.companyId, companyId)));
    if (!r) throw new BadRequestException('Role not found for this company');
  }

  private async assertCompetencyAllowed(
    competencyId: string,
    companyId: string,
  ) {
    const [c] = await this.db
      .select({
        id: performanceCompetencies.id,
        companyId: performanceCompetencies.companyId,
        isGlobal: performanceCompetencies.isGlobal,
      })
      .from(performanceCompetencies)
      .where(eq(performanceCompetencies.id, competencyId));
    if (!c || !(c.isGlobal || c.companyId === companyId)) {
      throw new BadRequestException('Competency not found or not allowed');
    }
  }

  private async assertLevelExists(levelId: string) {
    const [l] = await this.db
      .select({ id: competencyLevels.id })
      .from(competencyLevels)
      .where(eq(competencyLevels.id, levelId));
    if (!l) throw new BadRequestException('Competency level not found');
  }

  // ── write ops ───────────────────────────────────────────────────────────────
  async create(companyId: string, dto: CreateRoleExpectationDto, user: User) {
    await Promise.all([
      this.assertRoleInCompany(dto.roleId, companyId),
      this.assertCompetencyAllowed(dto.competencyId, companyId),
      this.assertLevelExists(dto.expectedLevelId),
    ]);

    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.companyId, companyId),
        eq(roleCompetencyExpectations.roleId, dto.roleId),
        eq(roleCompetencyExpectations.competencyId, dto.competencyId),
      ),
    });

    if (existing) {
      const [updated] = await this.db
        .update(roleCompetencyExpectations)
        .set({ expectedLevelId: dto.expectedLevelId })
        .where(eq(roleCompetencyExpectations.id, existing.id))
        .returning();

      await this.auditService.logAction({
        action: 'update',
        entity: 'role_competency_expectation',
        entityId: existing.id,
        userId: user.id,
        details: `Updated expectation for role:${dto.roleId}, competency:${dto.competencyId}`,
        changes: { expectedLevelId: dto.expectedLevelId },
      });

      await this.bump(companyId);
      return updated;
    }

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
      details: `Created expectation for role:${dto.roleId}, competency:${dto.competencyId}`,
      changes: {
        roleId: dto.roleId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId,
      },
    });

    await this.bump(companyId);
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

    // Validate referenced ids if provided
    await Promise.all([
      dto.roleId
        ? this.assertRoleInCompany(dto.roleId, user.companyId)
        : Promise.resolve(),
      dto.competencyId
        ? this.assertCompetencyAllowed(dto.competencyId, user.companyId)
        : Promise.resolve(),
      dto.expectedLevelId
        ? this.assertLevelExists(dto.expectedLevelId)
        : Promise.resolve(),
    ]);

    const [updated] = await this.db
      .update(roleCompetencyExpectations)
      .set({
        roleId: dto.roleId ?? existing.roleId,
        competencyId: dto.competencyId ?? existing.competencyId,
        expectedLevelId: dto.expectedLevelId ?? existing.expectedLevelId,
      })
      .where(eq(roleCompetencyExpectations.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'role_competency_expectation',
      entityId: id,
      userId: user.id,
      details: `Updated expectation for role: ${updated.roleId}`,
      changes: {
        roleId: updated.roleId,
        competencyId: updated.competencyId,
        expectedLevelId: updated.expectedLevelId,
      },
    });

    await this.bump(user.companyId);
    return updated;
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

    await this.bump(user.companyId);
    return { message: 'Deleted successfully' };
  }

  // ── reads (cached) ──────────────────────────────────────────────────────────
  async list(companyId: string) {
    const key = [...this.ns(), 'list'] as const;
    return this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () =>
        this.db.query.roleCompetencyExpectations.findMany({
          where: eq(roleCompetencyExpectations.companyId, companyId),
        }),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getFrameworkSettings(companyId: string) {
    const key = [...this.ns(), 'framework-settings'] as const;
    return this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () => {
        const [roles, expectations] = await Promise.all([
          this.db
            .select({ id: jobRoles.id, title: jobRoles.title })
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
              eq(
                roleCompetencyExpectations.expectedLevelId,
                competencyLevels.id,
              ),
            )
            .where(eq(roleCompetencyExpectations.companyId, companyId)),
        ]);

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
          if (!expectationsByRole[item.roleId])
            expectationsByRole[item.roleId] = [];
          expectationsByRole[item.roleId].push({
            id: item.id,
            competencyName: item.competencyName ?? '',
            levelName: item.levelName ?? '',
            competencyId: item.competencyId,
          });
        }

        return { roles, expectationsByRole };
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getFrameworkFields(companyId: string) {
    const key = [...this.ns(), 'framework-fields'] as const;
    return this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () => {
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
          .select({ id: competencyLevels.id, name: competencyLevels.name })
          .from(competencyLevels);

        return { competencies, levels };
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getAllCompetencyLevels() {
    // company-agnostic; simple cache is fine
    const key = 'competency-levels:all';
    return this.cache.getOrSetCache(
      key,
      async () => {
        return this.db
          .select({ id: competencyLevels.id, name: competencyLevels.name })
          .from(competencyLevels);
      },
      { ttlSeconds: this.ttlSeconds },
    );
  }
}
