import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { employees, jobRoles } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class JobRolesService extends BaseCrudService<
  { title: string; level?: string; description?: string },
  typeof jobRoles
> {
  protected table = jobRoles;

  constructor(
    @Inject(DRIZZLE) db: db,
    audit: AuditService,
    private readonly companySettings: CompanySettingsService,
    private readonly cache: CacheService,
    private readonly logger: PinoLogger,
  ) {
    super(db, audit);
    this.logger.setContext(JobRolesService.name);
  }

  // ------------------------
  // Cache keys + invalidation
  // ------------------------
  private keys(companyId: string) {
    return {
      list: `jobroles:list:${companyId}`,
      one: (id: string) => `jobroles:one:${companyId}:${id}`,
    };
  }

  private async invalidate(companyId: string, id?: string) {
    const k = this.keys(companyId);
    const keys = [k.list, id ? k.one(id) : undefined].filter(
      Boolean,
    ) as string[];

    this.logger.debug(
      { companyId, keys, id },
      'jobroles:cache:invalidate:start',
    );
    await Promise.all(keys.map((key) => this.cache.del?.(key)));
    this.logger.debug({ companyId, id }, 'jobroles:cache:invalidate:done');
  }

  // ------------------------
  // Mutations
  // ------------------------
  async create(companyId: string, dto: CreateJobRoleDto) {
    this.logger.info({ companyId, dto }, 'jobroles:create:start');

    const existingJobRole = await this.db
      .select()
      .from(jobRoles)
      .where(
        and(eq(jobRoles.companyId, companyId), eq(jobRoles.title, dto.title)),
      )
      .execute();

    if (existingJobRole.length) {
      this.logger.warn(
        { companyId, title: dto.title },
        'jobroles:create:duplicate',
      );
      throw new BadRequestException('Job role already exists');
    }

    const [created] = await this.db
      .insert(jobRoles)
      .values({
        title: dto.title,
        level: dto.level,
        description: dto.description,
        companyId,
      })
      .returning({ id: jobRoles.id })
      .execute();

    await this.companySettings.setSetting(
      companyId,
      'onboarding_job_roles',
      true,
    );

    await this.invalidate(companyId);

    this.logger.info(
      { companyId, jobRoleId: created.id },
      'jobroles:create:done',
    );
    return created;
  }

  async bulkCreate(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rows: rows?.length ?? 0 },
      'jobroles:bulkCreate:start',
    );

    const existingJobRoles = await this.db
      .select()
      .from(jobRoles)
      .where(eq(jobRoles.companyId, companyId))
      .execute();

    const existingTitles = new Set(existingJobRoles.map((role) => role.title));
    const duplicateTitles = rows
      .map((row) => row['Title'] ?? row['title'])
      .filter((title) => existingTitles.has(title));

    if (duplicateTitles.length) {
      this.logger.warn(
        { companyId, duplicateTitles },
        'jobroles:bulkCreate:duplicates',
      );
      throw new BadRequestException(
        'Duplicate job roles found: ' + duplicateTitles.join(', '),
      );
    }

    const dtos: CreateJobRoleDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateJobRoleDto, {
        title: row['Title'] ?? row['title'],
        level: row['Level'] ?? row['level'],
        description: row['Description'] ?? row['description'],
      });
      const errors = await validate(dto);
      if (errors.length) {
        this.logger.warn(
          { companyId, errors },
          'jobroles:bulkCreate:validation-error',
        );
        throw new BadRequestException(
          'Invalid data in bulk upload: ' + JSON.stringify(errors),
        );
      }
      dtos.push(dto);
    }

    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        title: d.title,
        level: d.level,
        description: d.description,
      }));

      const result = await trx
        .insert(jobRoles)
        .values(values)
        .returning({ id: jobRoles.id, title: jobRoles.title })
        .execute();

      return result;
    });

    await this.companySettings.setSetting(
      companyId,
      'onboarding_job_roles',
      true,
    );

    await this.invalidate(companyId);

    this.logger.info(
      { companyId, created: inserted.length },
      'jobroles:bulkCreate:done',
    );
    return inserted;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateJobRoleDto,
    userId: string,
    ip: string,
  ) {
    this.logger.info(
      { companyId, jobRoleId: id, dto, userId, ip },
      'jobroles:update:start',
    );

    const res = await this.updateWithAudit(
      companyId,
      id,
      { title: dto.title, level: dto.level, description: dto.description },
      {
        entity: 'JobRole',
        action: 'UpdateJobRole',
        fields: ['title', 'level', 'description'],
      },
      userId,
      ip,
    );

    await this.invalidate(companyId, id);

    this.logger.info({ companyId, jobRoleId: id }, 'jobroles:update:done');
    return res;
  }

  async remove(companyId: string, id: string) {
    this.logger.info({ companyId, jobRoleId: id }, 'jobroles:remove:start');

    const jobRole = await this.db
      .select()
      .from(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();

    if (!jobRole.length) {
      this.logger.warn(
        { companyId, jobRoleId: id },
        'jobroles:remove:not-found',
      );
      throw new NotFoundException('Job role not found');
    }

    // Block deletion if any employees are assigned to this job role
    const [{ count }] = await this.db
      .select({
        count: sql<number>`CAST(COUNT(*) AS int)`,
      })
      .from(employees)
      .where(
        and(eq(employees.companyId, companyId), eq(employees.jobRoleId, id)),
      )
      .execute();

    if (count > 0) {
      this.logger.warn(
        { companyId, jobRoleId: id, employeeCount: count },
        'jobroles:remove:blocked:employees-assigned',
      );
      throw new BadRequestException(
        `Cannot delete job role: ${count} employee(s) are assigned to it.`,
      );
    }

    const res = await this.db
      .delete(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();

    // Optional: audit delete
    // await this.audit.log?.({ entity: 'JobRole', entityId: id, action: 'DeleteJobRole' });

    await this.invalidate(companyId, id);

    this.logger.info({ companyId, jobRoleId: id }, 'jobroles:remove:done');
    return res;
  }

  // ------------------------
  // Reads (cached)
  // ------------------------
  async findAll(companyId: string) {
    const cacheKey = this.keys(companyId).list;
    this.logger.debug({ companyId, cacheKey }, 'jobroles:findAll:start');

    const rows = await this.cache.getOrSetCache(cacheKey, async () => {
      return this.db
        .select()
        .from(jobRoles)
        .where(and(eq(jobRoles.companyId, companyId)))
        .orderBy(jobRoles.title)
        .execute();
    });

    this.logger.debug(
      { companyId, count: rows.length },
      'jobroles:findAll:done',
    );
    return rows;
  }

  async findOne(companyId: string, id: string) {
    const cacheKey = this.keys(companyId).one(id);
    this.logger.debug(
      { companyId, jobRoleId: id, cacheKey },
      'jobroles:findOne:start',
    );

    const row = await this.cache.getOrSetCache(cacheKey, async () => {
      const rows = await this.db
        .select()
        .from(jobRoles)
        .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
        .execute();

      if (!rows.length) {
        this.logger.warn(
          { companyId, jobRoleId: id },
          'jobroles:findOne:not-found',
        );
        throw new NotFoundException('Job role not found');
      }
      return rows[0];
    });

    this.logger.debug({ companyId, jobRoleId: id }, 'jobroles:findOne:done');
    return row;
  }
}
