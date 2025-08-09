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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeaveTypesService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(LeaveTypesService.name);
  }

  // ---------- cache keys ----------
  private oneKey(companyId: string, id: string) {
    return `company:${companyId}:leavetypes:${id}:detail`;
  }
  private listKey(companyId: string) {
    return `company:${companyId}:leavetypes:list`;
  }
  private nameKey(companyId: string, name: string) {
    return `company:${companyId}:leavetypes:name:${name.toLowerCase()}`;
  }
  private async burst(opts: {
    companyId?: string;
    id?: string;
    name?: string;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) {
      jobs.push(this.cache.del(this.listKey(opts.companyId)));
      if (opts.id)
        jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
      if (opts.name)
        jobs.push(this.cache.del(this.nameKey(opts.companyId, opts.name)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:leavetypes');
  }

  // ---------- bulk create ----------
  async bulkCreateLeaveTypes(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rows: rows?.length ?? 0 },
      'leavetypes:bulkCreate:start',
    );

    // 1) Map and validate to DTOs
    const dtos: CreateLeaveTypeDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateLeaveTypeDto, {
        name: row['Name'] || row['name'],
        isPaid:
          row['IsPaid'] !== undefined
            ? row['IsPaid'] === 'true' || row['IsPaid'] === true
            : undefined,
        colorTag: row['ColorTag'] || row['colorTag'],
      });

      const errs = await validate(dto);
      if (errs.length) {
        this.logger.warn({ errs }, 'leavetypes:bulkCreate:validation-failed');
        throw new BadRequestException(
          'Invalid CSV format or data: ' + JSON.stringify(errs),
        );
      }

      dtos.push(dto);
    }

    // 2) Check for duplicates by name (case-insensitive within input & DB)
    const inputNames = dtos.map((d) => d.name.trim());
    const lowerToOriginal = new Map(
      inputNames.map((n) => [n.toLowerCase(), n]),
    );
    if (lowerToOriginal.size !== inputNames.length) {
      const counts: Record<string, number> = {} as any;
      inputNames.forEach(
        (n) => (counts[n.toLowerCase()] = (counts[n.toLowerCase()] || 0) + 1),
      );
      const dups = Object.entries(counts)
        .filter(([, c]) => c > 1)
        .map(([k]) => lowerToOriginal.get(k));
      this.logger.warn({ dups }, 'leavetypes:bulkCreate:input-duplicates');
      throw new BadRequestException(
        `Duplicate leave type names in file: ${dups?.join(', ')}`,
      );
    }

    const duplicates = await this.db
      .select({ name: leaveTypes.name })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          inArray(leaveTypes.name, inputNames),
        ),
      )
      .execute();

    if (duplicates.length) {
      const duplicateNames = duplicates.map((d) => d.name);
      this.logger.warn(
        { duplicateNames },
        'leavetypes:bulkCreate:db-duplicates',
      );
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

      const result = await trx
        .insert(leaveTypes)
        .values(values)
        .returning({
          id: leaveTypes.id,
          name: leaveTypes.name,
          isPaid: leaveTypes.isPaid,
          colorTag: leaveTypes.colorTag,
        })
        .execute();

      return result;
    });

    await this.burst({ companyId });
    this.logger.info(
      { companyId, inserted: inserted.length },
      'leavetypes:bulkCreate:done',
    );
    return inserted;
  }

  // ---------- create ----------
  async create(dto: CreateLeaveTypeDto, user: User, ip: string) {
    this.logger.info(
      { companyId: user.companyId, dto },
      'leavetypes:create:start',
    );

    // 1. Check if leave type already exists
    const existingLeaveType = await this.db
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, user.companyId),
          eq(leaveTypes.name, dto.name),
        ),
      )
      .execute();

    if (existingLeaveType.length > 0) {
      this.logger.warn(
        { companyId: user.companyId, name: dto.name },
        'leavetypes:create:duplicate',
      );
      throw new BadRequestException(
        `Leave type with name ${dto.name} already exists`,
      );
    }

    // 2. Create leave type
    const [created] = await this.db
      .insert(leaveTypes)
      .values({
        companyId: user.companyId,
        name: dto.name,
        isPaid: dto.isPaid,
        colorTag: dto.colorTag,
      })
      .returning()
      .execute();

    // 3. Create audit record
    await this.auditService.logAction({
      action: 'create',
      entity: 'leave_type',
      entityId: created.id,
      details: 'Created new leave type',
      userId: user.id,
      ipAddress: ip,
      changes: { name: dto.name, isPaid: dto.isPaid, colorTag: dto.colorTag },
    });

    await this.burst({
      companyId: user.companyId,
      id: created.id,
      name: created.name,
    });
    this.logger.info({ id: created.id }, 'leavetypes:create:done');
    return created;
  }

  // ---------- queries ----------
  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'leavetypes:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(leaveTypes)
        .where(eq(leaveTypes.companyId, companyId))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'leavetypes:list:db:done',
      );
      return rows;
    });
  }

  async findOne(companyId: string, leaveTypeId: string) {
    const key = this.oneKey(companyId, leaveTypeId);
    this.logger.debug(
      { key, companyId, leaveTypeId },
      'leavetypes:findOne:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
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
      return rows[0] ?? null;
    });

    if (!row) {
      this.logger.warn(
        { companyId, leaveTypeId },
        'leavetypes:findOne:not-found',
      );
      throw new NotFoundException(
        `Leave type with ID ${leaveTypeId} not found`,
      );
    }

    return row;
  }

  // ---------- update ----------
  async update(
    leaveTypeId: string,
    dto: UpdateLeaveTypeDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;
    this.logger.info(
      { companyId, leaveTypeId, dto },
      'leavetypes:update:start',
    );

    const existing = await this.findOne(companyId, leaveTypeId);

    const [updated] = await this.db
      .update(leaveTypes)
      .set({
        name: dto.name ?? existing.name,
        isPaid: dto.isPaid ?? existing.isPaid,
        colorTag: dto.colorTag ?? existing.colorTag,
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
      changes: { name: dto.name, isPaid: dto.isPaid, colorTag: dto.colorTag },
    });

    await this.burst({ companyId, id: leaveTypeId, name: updated.name });
    this.logger.info({ id: leaveTypeId }, 'leavetypes:update:done');
    return updated;
  }

  // ---------- delete ----------
  async remove(leaveTypeId: string, user: User, ip: string) {
    const { companyId, id } = user;
    this.logger.info({ companyId, leaveTypeId }, 'leavetypes:delete:start');

    await this.findOne(companyId, leaveTypeId);

    // Check if there are any policies using this leave type
    const policyExists = await this.db
      .select({ id: leavePolicies.id })
      .from(leavePolicies)
      .where(
        and(
          eq(leavePolicies.leaveTypeId, leaveTypeId),
          eq(leavePolicies.companyId, companyId),
        ),
      )
      .execute();

    if (policyExists && policyExists.length > 0) {
      this.logger.warn(
        { companyId, leaveTypeId, count: policyExists.length },
        'leavetypes:delete:has-policies',
      );
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
      entityId: leaveTypeId,
      details: 'Deleted leave type',
      userId: id,
      ipAddress: ip,
    });

    await this.burst({ companyId, id: leaveTypeId });
    this.logger.info({ id: leaveTypeId }, 'leavetypes:delete:done');
    return { success: true, message: 'Leave type deleted successfully' };
  }
}
