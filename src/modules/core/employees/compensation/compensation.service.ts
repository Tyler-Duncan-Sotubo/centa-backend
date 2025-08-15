import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq } from 'drizzle-orm';
import { employeeCompensations } from '../schema/compensation.schema';
import { employees } from '../schema/employee.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CompensationService {
  protected table = employeeCompensations;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is employeeId or "global"
    return [
      `employee:${scope}:compensation`,
      `employee:${scope}:compensation:list`,
      `employee:${scope}:compensation:detail`,
    ];
  }

  async upsert(
    employeeId: string,
    dto: CreateCompensationDto,
    userId: string,
    ip: string,
  ) {
    // Check if Employee exists
    const [employee] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();

    if (employee) {
      const [updated] = await this.db
        .update(this.table)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(this.table.employeeId, employeeId))
        .returning()
        .execute();

      const changes: Record<string, any> = {};
      for (const key of Object.keys(dto)) {
        const before = (employee as any)[key];
        const after = (dto as any)[key];
        if (before !== after) {
          changes[key] = { before, after };
        }
      }
      if (Object.keys(changes).length) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'EmployeeCompensation',
          details: 'Created new employee compensation',
          userId,
          entityId: employeeId,
          ipAddress: ip,
          changes,
        });
      }

      // Invalidate caches for this employee and global detail cache
      await this.cache.bumpCompanyVersion(employeeId);
      await this.cache.bumpCompanyVersion('global');

      return updated;
    } else {
      const [created] = await this.db
        .insert(this.table)
        .values({
          employeeId,
          payFrequency: dto.payFrequency || 'monthly',
          currency: dto.currency,
          grossSalary: dto.grossSalary * 100,
          effectiveDate: new Date().toISOString(),
        })
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'create',
        entity: 'EmployeeCompensation',
        details: 'Created new employee compensation',
        userId,
        entityId: employeeId,
        ipAddress: ip,
        changes: { ...dto },
      });

      // Invalidate caches
      await this.cache.bumpCompanyVersion(employeeId);
      await this.cache.bumpCompanyVersion('global');

      return created;
    }
  }

  async create(
    employeeId: string,
    dto: CreateCompensationDto,
    userId: string,
    ip: string,
    trx?: typeof this.db,
  ) {
    // Check if Employee Compensation exists
    const [compensation] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();

    if (compensation && compensation.grossSalary === dto.grossSalary) {
      throw new NotFoundException(
        `compensation for employee ${employeeId} with ${dto.grossSalary} already exists`,
      );
    }

    const [created] = await (trx ?? this.db)
      .insert(this.table)
      .values({
        employeeId,
        payFrequency: dto.payFrequency,
        currency: dto.currency,
        grossSalary: dto.grossSalary,
        effectiveDate: new Date().toISOString(),
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'EmployeeCompensation',
      details: 'Created new employee compensation',
      userId,
      entityId: employeeId,
      ipAddress: ip,
      changes: { ...dto },
    });

    // Invalidate caches
    await this.cache.bumpCompanyVersion(employeeId);
    await this.cache.bumpCompanyVersion('global');

    return created;
  }

  // READ (cached per employee)
  async findAll(employeeId: string) {
    return this.cache.getOrSetVersioned(
      employeeId,
      ['compensation', 'list', employeeId],
      async () => {
        const [compensation] = await this.db
          .select({
            id: this.table.id,
            employeeId: this.table.employeeId,
            grossSalary: this.table.grossSalary,
            payGroupId: employees.payGroupId,
            applyNhf: this.table.applyNHf,
            startDate: employees.employmentStartDate,
            endDate: employees.employmentEndDate,
          })
          .from(this.table)
          .innerJoin(employees, eq(employees.id, this.table.employeeId))
          .where(eq(this.table.employeeId, employeeId))
          .execute();

        if (!compensation) {
          throw new NotFoundException(
            `compensation for employee ${employeeId} not found`,
          );
        }

        return compensation;
      },
      { tags: this.tags(employeeId) },
    );
  }

  // READ (cached; no employeeId provided → global scope)
  async findOne(compensationId: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['compensation', 'detail', compensationId],
      async () => {
        const [compensation] = await this.db
          .select({
            id: this.table.id,
            employeeId: this.table.employeeId,
            grossSalary: this.table.grossSalary,
            payGroupId: employees.payGroupId,
            applyNhf: this.table.applyNHf,
          })
          .from(this.table)
          .leftJoin(employees, eq(employees.id, this.table.employeeId))
          .where(eq(this.table.id, compensationId))
          .execute();

        if (!compensation) {
          throw new NotFoundException(
            `compensation for employee ${compensationId} not found`,
          );
        }

        return compensation;
      },
      { tags: this.tags('global') },
    );
  }

  async update(
    compensationId: string,
    dto: UpdateCompensationDto,
    userId: string,
    ip: string,
  ) {
    // Check if Employee exists
    const [dependant] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, compensationId))
      .execute();

    if (!dependant) {
      throw new NotFoundException(
        `compensation for employee ${compensationId} not found`,
      );
    }

    const [updated] = await this.db
      .update(this.table)
      .set({ ...dto })
      .where(eq(this.table.id, compensationId))
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
        entity: 'EmployeeCompensation',
        details: 'Updated employee compensation',
        userId,
        entityId: compensationId,
        ipAddress: ip,
        changes,
      });
    }

    // Invalidate caches (employee + global)
    await this.cache.bumpCompanyVersion(dependant.employeeId);
    await this.cache.bumpCompanyVersion('global');

    return updated;
  }

  async remove(compensationId: string) {
    // fetch to know employeeId for precise cache bump
    const [existing] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, compensationId))
      .execute();

    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, compensationId))
      .returning({ id: this.table.id })
      .execute();

    if (!result.length) {
      throw new NotFoundException(
        `Profile for employee ${compensationId} not found`,
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
