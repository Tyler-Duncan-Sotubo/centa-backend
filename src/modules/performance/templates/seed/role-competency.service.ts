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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class RoleCompetencyExpectationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(RoleCompetencyExpectationService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `rce:${companyId}:list`;
  }
  private settingsKey(companyId: string) {
    return `rce:${companyId}:framework:settings`;
  }
  private fieldsKey(companyId: string) {
    return `rce:${companyId}:framework:fields`;
  }
  private levelsKey() {
    return `rce:levels:all`;
  }

  private async burst(opts: { companyId: string }) {
    const jobs: Promise<any>[] = [];
    jobs.push(this.cache.del(this.listKey(opts.companyId)));
    jobs.push(this.cache.del(this.settingsKey(opts.companyId)));
    // fields usually change only when competencies/levels change, but safe to clear:
    jobs.push(this.cache.del(this.fieldsKey(opts.companyId)));
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'rce:cache:burst');
  }

  // ---------- mutations ----------
  async create(companyId: string, dto: CreateRoleExpectationDto, user: User) {
    this.logger.info({ companyId, userId: user.id, dto }, 'rce:create:start');

    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.companyId, companyId),
        eq(roleCompetencyExpectations.roleId, dto.roleId),
        eq(roleCompetencyExpectations.competencyId, dto.competencyId),
      ),
    });

    if (existing) {
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
        changes: { expectedLevelId: dto.expectedLevelId },
      });

      await this.burst({ companyId });
      this.logger.info({ id: existing.id }, 'rce:create:update-duplicate:done');
      return { ...existing, expectedLevelId: dto.expectedLevelId };
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
      details: `Created expectation for role: ${dto.roleId}, competency: ${dto.competencyId}`,
      changes: {
        roleId: dto.roleId,
        competencyId: dto.competencyId,
        expectedLevelId: dto.expectedLevelId,
      },
    });

    await this.burst({ companyId });
    this.logger.info({ id: created.id }, 'rce:create:done');
    return created;
  }

  async update(id: string, dto: UpdateRoleExpectationDto, user: User) {
    this.logger.info({ id, userId: user.id, dto }, 'rce:update:start');

    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.id, id),
        eq(roleCompetencyExpectations.companyId, user.companyId),
      ),
    });

    if (!existing) {
      this.logger.warn(
        { id, companyId: user.companyId },
        'rce:update:not-found',
      );
      throw new NotFoundException('Expectation not found');
    }

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

    await this.burst({ companyId: user.companyId });
    this.logger.info({ id }, 'rce:update:done');
    return { message: 'Updated successfully' };
  }

  async delete(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'rce:delete:start');

    const existing = await this.db.query.roleCompetencyExpectations.findFirst({
      where: and(
        eq(roleCompetencyExpectations.id, id),
        eq(roleCompetencyExpectations.companyId, user.companyId),
      ),
    });

    if (!existing) {
      this.logger.warn(
        { id, companyId: user.companyId },
        'rce:delete:not-found',
      );
      throw new NotFoundException('Expectation not found');
    }

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

    await this.burst({ companyId: user.companyId });
    this.logger.info({ id }, 'rce:delete:done');
    return { message: 'Deleted successfully' };
  }

  // ---------- queries (cached) ----------
  async list(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'rce:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db.query.roleCompetencyExpectations.findMany({
        where: eq(roleCompetencyExpectations.companyId, companyId),
      });
      this.logger.debug({ companyId, count: rows.length }, 'rce:list:db:done');
      return rows;
    });
  }

  async getFrameworkSettings(companyId: string) {
    const key = this.settingsKey(companyId);
    this.logger.debug({ companyId, key }, 'rce:frameworkSettings:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
            eq(roleCompetencyExpectations.expectedLevelId, competencyLevels.id),
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

      const out = { roles, expectationsByRole };
      this.logger.debug(
        { companyId, roles: roles.length },
        'rce:frameworkSettings:db:done',
      );
      return out;
    });
  }

  async getFrameworkFields(companyId: string) {
    const key = this.fieldsKey(companyId);
    this.logger.debug({ companyId, key }, 'rce:frameworkFields:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const competenciesRows = await this.db
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

      const levelsRows = await this.db
        .select({ id: competencyLevels.id, name: competencyLevels.name })
        .from(competencyLevels);

      const out = { competencies: competenciesRows, levels: levelsRows };
      this.logger.debug(
        {
          companyId,
          competencies: competenciesRows.length,
          levels: levelsRows.length,
        },
        'rce:frameworkFields:db:done',
      );
      return out;
    });
  }

  async getAllCompetencyLevels() {
    const key = this.levelsKey();
    this.logger.debug({ key }, 'rce:getAllLevels:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({ id: competencyLevels.id, name: competencyLevels.name })
        .from(competencyLevels);
      this.logger.debug({ count: rows.length }, 'rce:getAllLevels:db:done');
      return rows;
    });
  }
}
