import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { leaveTypes } from '../schema/leave-types.schema';
import { User } from 'src/common/types/user.type';
import { and, eq, inArray } from 'drizzle-orm';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { leavePolicies } from '../schema/leave-policies.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeaveTypesService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  /** Common tags for this domain (used for Redis tag invalidation if available) */
  private tags(companyId: string) {
    return [`company:${companyId}:leave`, `company:${companyId}:leave:types`];
  }

  async bulkCreateLeaveTypes(companyId: string, rows: any[]) {
    // 1) Map and validate to DTOs
    const dtos: CreateLeaveTypeDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateLeaveTypeDto, {
        name: row['Name'] || row['name'],
        isPaid:
          row['IsPaid'] !== undefined
            ? ['true', '1', 'yes'].includes(String(row['IsPaid']).toLowerCase())
            : undefined,
        colorTag: row['ColorTag'] || row['colorTag'],
      });

      const errs = await validate(dto);
      if (errs.length) {
        throw new BadRequestException(
          'Invalid CSV format or data: ' + JSON.stringify(errs),
        );
      }
      dtos.push(dto);
    }

    // 2) Check for duplicates by name
    const names = dtos.map((d) => d.name);
    const duplicates = await this.db
      .select({ name: leaveTypes.name })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          inArray(leaveTypes.name, names),
        ),
      )
      .execute();

    if (duplicates.length) {
      const duplicateNames = duplicates.map((d) => d.name);
      throw new BadRequestException(
        `Leave type names already exist: ${duplicateNames.join(', ')}`,
      );
    }

    // 3) Insert in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        name: d.name,
        isPaid: d.isPaid ?? false,
        colorTag: d.colorTag || null,
      }));

      return trx
        .insert(leaveTypes)
        .values(values)
        .returning({
          id: leaveTypes.id,
          name: leaveTypes.name,
          isPaid: leaveTypes.isPaid,
          colorTag: leaveTypes.colorTag,
        })
        .execute();
    });

    // Invalidate reads
    await this.cache.bumpCompanyVersion(companyId);

    return inserted;
  }

  async create(dto: CreateLeaveTypeDto, user: User, ip: string) {
    const { companyId, id } = user;

    // 1. Check if leave type already exists
    const existing = await this.db
      .select()
      .from(leaveTypes)
      .where(
        and(eq(leaveTypes.companyId, companyId), eq(leaveTypes.name, dto.name)),
      )
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException(
        `Leave type with name "${dto.name}" already exists`,
      );
    }

    // 2. Create leave type
    const [created] = await this.db
      .insert(leaveTypes)
      .values({
        companyId,
        name: dto.name,
        isPaid: dto.isPaid ?? false,
        colorTag: dto.colorTag ?? null,
      })
      .returning()
      .execute();

    // 3. Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'leave_type',
      entityId: created.id,
      details: 'Created new leave type',
      userId: id,
      ipAddress: ip,
      changes: {
        name: dto.name,
        isPaid: dto.isPaid ?? false,
        colorTag: dto.colorTag ?? null,
      },
    });

    // Invalidate reads
    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'types', 'list'],
      async () => {
        return this.db
          .select()
          .from(leaveTypes)
          .where(eq(leaveTypes.companyId, companyId))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(companyId: string, leaveTypeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'types', 'one', leaveTypeId],
      async () => {
        const rows = await this.db
          .select()
          .from(leaveTypes)
          .where(
            and(
              eq(leaveTypes.companyId, companyId),
              eq(leaveTypes.id, leaveTypeId),
            ),
          )
          .execute();

        if (!rows.length) {
          throw new NotFoundException(
            `Leave type with ID ${leaveTypeId} not found`,
          );
        }
        return rows[0];
      },
      { tags: this.tags(companyId) },
    );
  }

  async update(
    leaveTypeId: string,
    dto: UpdateLeaveTypeDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;

    const current = await this.findOne(companyId, leaveTypeId);

    const [updated] = await this.db
      .update(leaveTypes)
      .set({
        name: dto.name ?? current.name,
        isPaid: dto.isPaid ?? current.isPaid,
        colorTag: dto.colorTag ?? current.colorTag,
      })
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, leaveTypeId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'leave_type',
      entityId: leaveTypeId,
      userId: id,
      details: 'Updated leave type',
      ipAddress: ip,
      changes: { before: current, after: updated },
    });

    // Invalidate reads
    await this.cache.bumpCompanyVersion(companyId);

    return updated;
  }

  async remove(user: User, leaveTypeId: string) {
    const { companyId, id } = user;

    // Ensure the leave type exists
    const existing = await this.findOne(companyId, leaveTypeId);

    // Check if there are any policies using this leave type
    const policyExists = await this.db
      .select()
      .from(leavePolicies)
      .where(eq(leavePolicies.leaveTypeId, leaveTypeId))
      .execute();

    if (policyExists?.length) {
      throw new BadRequestException(
        "Cannot delete leave type: it's used by one or more leave policies.",
      );
    }

    await this.db
      .delete(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, leaveTypeId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'leave_type',
      entityId: existing.id,
      details: 'Deleted leave type',
      userId: id,
      changes: { id: existing.id, name: existing.name },
    });

    // Invalidate reads
    await this.cache.bumpCompanyVersion(companyId);

    return { success: true, message: 'Leave type deleted successfully' };
  }
}
