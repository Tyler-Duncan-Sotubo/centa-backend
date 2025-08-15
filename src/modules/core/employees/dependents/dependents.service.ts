import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq } from 'drizzle-orm';
import { employeeDependents } from '../schema/dependents.schema';
import { UpdateDependentDto } from './dto/update-dependent.dto';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class DependentsService {
  protected table = employeeDependents;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is employeeId or "global"
    return [
      `employee:${scope}:dependents`,
      `employee:${scope}:dependents:list`,
      `employee:${scope}:dependents:detail`,
    ];
  }

  async create(
    employeeId: string,
    dto: CreateDependentDto,
    userId: string,
    ip: string,
  ) {
    const [created] = await this.db
      .insert(this.table)
      .values({ employeeId, ...dto })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'Employee Dependent',
      details: 'Created new employee dependent',
      userId,
      entityId: employeeId,
      ipAddress: ip,
      changes: { ...dto },
    });

    // Invalidate caches for this employee and global detail entries
    await this.cache.bumpCompanyVersion(employeeId);
    await this.cache.bumpCompanyVersion('global');

    return created;
  }

  // READ (cached per employee)
  findAll(employeeId: string) {
    return this.cache.getOrSetVersioned(
      employeeId,
      ['dependents', 'list', employeeId],
      async () => {
        const rows = await this.db
          .select()
          .from(this.table)
          .where(eq(this.table.employeeId, employeeId))
          .execute();
        return rows;
      },
      { tags: this.tags(employeeId) },
    );
  }

  // READ (cached; no employeeId provided → global scope)
  async findOne(dependentId: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['dependents', 'detail', dependentId],
      async () => {
        const [dependent] = await this.db
          .select()
          .from(this.table)
          .where(eq(this.table.id, dependentId))
          .execute();

        if (!dependent) {
          return {};
        }
        return dependent;
      },
      { tags: this.tags('global') },
    );
  }

  async update(
    dependentId: string,
    dto: UpdateDependentDto,
    userId: string,
    ip: string,
  ) {
    // Check if record exists
    const [dependant] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, dependentId))
      .execute();

    if (!dependant) {
      throw new NotFoundException(
        `Dependent for employee ${dependentId} not found`,
      );
    }

    const [updated] = await this.db
      .update(this.table)
      .set({ ...dto })
      .where(eq(this.table.id, dependentId))
      .returning()
      .execute();

    const changes: Record<string, any> = {};
    for (const key of Object.keys(dto)) {
      const before = (dependant as any)[key];
      const after = (dto as any)[key];
      if (before !== after) {
        changes[key] = { before, after };
      }
    }
    if (Object.keys(changes).length) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'Employee Dependent',
        details: 'Updated employee dependent',
        userId,
        entityId: dependentId,
        ipAddress: ip,
        changes,
      });
    }

    // Invalidate caches: employee (from existing row) + global
    await this.cache.bumpCompanyVersion(dependant.employeeId);
    await this.cache.bumpCompanyVersion('global');

    return updated;
  }

  async remove(dependentId: string) {
    // grab for cache bump
    const [existing] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, dependentId))
      .execute();

    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, dependentId))
      .returning({ id: this.table.id })
      .execute();

    if (!result.length) {
      throw new NotFoundException(
        `Profile for employee ${dependentId} not found`,
      );
    }

    // Invalidate caches
    if (existing?.employeeId) {
      await this.cache.bumpCompanyVersion(existing.employeeId);
    }
    await this.cache.bumpCompanyVersion('global');

    return { deleted: true, id: result[0].id };
  }
}
