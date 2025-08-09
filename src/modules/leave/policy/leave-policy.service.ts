import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { leavePolicies } from '../schema/leave-policies.schema';
import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BulkCreateLeavePolicyDto } from './dto/create-bulk-policy.dto';
import { leaveTypes } from '../schema/leave-types.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeavePolicyService {
  protected readonly table = leavePolicies;

  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(LeavePolicyService.name);
  }

  // ---------- cache keys ----------
  private oneKey(companyId: string, id: string) {
    return `company:${companyId}:leavepol:${id}:detail`;
  }
  private listKey(companyId: string) {
    return `company:${companyId}:leavepol:list`;
  }
  private byLeaveTypeKey(companyId: string, leaveTypeId: string) {
    return `company:${companyId}:leavepol:byType:${leaveTypeId}`;
  }
  private accrualListKey(companyId: string, enabled: boolean) {
    return `company:${companyId}:leavepol:accrual:${enabled ? 'on' : 'off'}`;
  }
  private async burst(opts: {
    companyId?: string;
    id?: string;
    leaveTypeId?: string;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) {
      jobs.push(this.cache.del(this.listKey(opts.companyId)));
      jobs.push(this.cache.del(this.accrualListKey(opts.companyId, true)));
      jobs.push(this.cache.del(this.accrualListKey(opts.companyId, false)));
      if (opts.leaveTypeId)
        jobs.push(
          this.cache.del(this.byLeaveTypeKey(opts.companyId, opts.leaveTypeId)),
        );
      if (opts.id)
        jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:leavepol');
  }

  // ---------- bulk create ----------
  async bulkCreateLeavePolicies(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rows: rows?.length ?? 0 },
      'leavepol:bulkCreate:start',
    );

    // 1) Build leave type name → ID map
    const leaveTypesList = await this.db
      .select({ id: leaveTypes.id, name: leaveTypes.name })
      .from(leaveTypes)
      .where(eq(leaveTypes.companyId, companyId))
      .execute();

    const leaveTypeMap = new Map(
      leaveTypesList.map((lt) => [lt.name.toLowerCase(), lt.id]),
    );

    const dtos: BulkCreateLeavePolicyDto[] = [];

    for (const row of rows) {
      const leaveTypeName = (
        row['LeaveTypeName'] ||
        row['leaveTypeName'] ||
        ''
      ).toLowerCase();
      const leaveTypeId = leaveTypeMap.get(leaveTypeName);

      if (!leaveTypeId) {
        this.logger.warn(
          { leaveTypeName },
          'leavepol:bulkCreate:missing-leavetype',
        );
        throw new BadRequestException(
          `Leave type "${leaveTypeName}" not found.`,
        );
      }

      const normalizeBool = (val: any) => String(val).toLowerCase() === 'true';

      // Build eligibilityRules from flattened fields
      const eligibilityRules: Record<string, any> = {};
      if (row['MinTenureMonths']) {
        eligibilityRules.minTenureMonths = Number(row['MinTenureMonths']);
      }
      if (normalizeBool(row['RequiresManagerApproval'])) {
        eligibilityRules.requiresManagerApproval = true;
      }

      const dto = plainToInstance(BulkCreateLeavePolicyDto, {
        leaveTypeId,
        accrualEnabled: normalizeBool(row['AccrualEnabled']),
        accrualFrequency: row['AccrualFrequency'] || row['accrualFrequency'],
        accrualAmount: row['AccrualAmount'] || row['accrualAmount'],
        maxBalance:
          row['MaxBalance'] !== undefined
            ? Number(row['MaxBalance'])
            : undefined,
        allowCarryover: normalizeBool(row['AllowCarryover']),
        carryoverLimit:
          row['CarryoverLimit'] !== undefined
            ? Number(row['CarryoverLimit'])
            : undefined,
        onlyConfirmedEmployees: normalizeBool(row['OnlyConfirmedEmployees']),
        eligibilityRules: Object.keys(eligibilityRules).length
          ? eligibilityRules
          : undefined,
        genderEligibility: row['GenderEligibility'] || row['genderEligibility'],
        leaveNature: row['LeaveNature'] || row['leaveNature'],
        isSplittable: normalizeBool(row['IsSplittable']),
      });

      const errs = await validate(dto);
      if (errs.length) {
        this.logger.warn({ errs }, 'leavepol:bulkCreate:validation-failed');
        throw new BadRequestException('Invalid data: ' + JSON.stringify(errs));
      }

      dtos.push(dto);
    }

    // 3) Insert all in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        leaveTypeId: d.leaveTypeId,
        accrualEnabled: d.accrualEnabled ?? false,
        accrualFrequency: d.accrualFrequency,
        accrualAmount: d.accrualAmount,
        maxBalance: d.maxBalance,
        allowCarryover: d.allowCarryover ?? false,
        carryoverLimit: d.carryoverLimit,
        onlyConfirmedEmployees: d.onlyConfirmedEmployees ?? false,
        eligibilityRules: d.eligibilityRules,
        genderEligibility: d.genderEligibility,
        leaveNature: d.leaveNature,
        isSplittable: d.isSplittable ?? false,
      }));

      return trx.insert(leavePolicies).values(values).returning().execute();
    });

    await this.burst({ companyId });
    this.logger.info(
      { companyId, inserted: inserted.length },
      'leavepol:bulkCreate:done',
    );
    return inserted;
  }

  // ---------- create ----------
  async create(dto: CreateLeavePolicyDto, user: User, ip: string) {
    const { companyId, id } = user;
    const leaveTypeId = dto.leaveTypeId;
    this.logger.info({ companyId, leaveTypeId, dto }, 'leavepol:create:start');

    // 1. Check if leave policy already exists
    const existing = await this.db
      .select({ id: this.table.id })
      .from(this.table)
      .where(
        and(
          eq(this.table.companyId, companyId),
          eq(this.table.leaveTypeId, leaveTypeId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      this.logger.warn({ companyId, leaveTypeId }, 'leavepol:create:duplicate');
      throw new BadRequestException(
        `Leave policy for leave type ${leaveTypeId} already exists`,
      );
    }

    // 2. Create leave policy
    const [leavePolicy] = await this.db
      .insert(this.table)
      .values({ companyId, ...dto })
      .returning()
      .execute();

    // 3. Create audit record
    await this.auditService.logAction({
      action: 'create',
      entity: 'leave_policy',
      entityId: leavePolicy.id,
      details: 'Created new leave policy',
      userId: id,
      ipAddress: ip,
      changes: { ...dto },
    });

    await this.burst({ companyId, id: leavePolicy.id, leaveTypeId });
    this.logger.info({ id: leavePolicy.id }, 'leavepol:create:done');
    return leavePolicy;
  }

  // ---------- queries ----------
  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'leavepol:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({
          id: leavePolicies.id,
          leaveTypeId: leavePolicies.leaveTypeId,
          accrualEnabled: leavePolicies.accrualEnabled,
          accrualFrequency: leavePolicies.accrualFrequency,
          accrualAmount: leavePolicies.accrualAmount,
          maxBalance: leavePolicies.maxBalance,
          allowCarryover: leavePolicies.allowCarryover,
          carryoverLimit: leavePolicies.carryoverLimit,
          onlyConfirmedEmployees: leavePolicies.onlyConfirmedEmployees,
          eligibilityRules: leavePolicies.eligibilityRules,
          genderEligibility: leavePolicies.genderEligibility,
          isSplittable: leavePolicies.isSplittable,
          leaveTypeName: leaveTypes.name,
        })
        .from(this.table)
        .innerJoin(leaveTypes, eq(leavePolicies.leaveTypeId, leaveTypes.id))
        .where(eq(this.table.companyId, companyId))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'leavepol:list:db:done',
      );
      return rows;
    });
  }

  async findLeavePoliciesByLeaveTypeId(companyId: string, leaveTypeId: string) {
    const key = this.byLeaveTypeKey(companyId, leaveTypeId);
    this.logger.debug(
      { key, companyId, leaveTypeId },
      'leavepol:byType:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.leaveTypeId, leaveTypeId),
            eq(this.table.companyId, companyId),
          ),
        )
        .execute();
      return rows[0] ?? null;
    });

    if (!row) {
      this.logger.warn({ companyId, leaveTypeId }, 'leavepol:byType:not-found');
      throw new NotFoundException(
        `Leave policy with leave type id ${leaveTypeId} not found`,
      );
    }

    return row;
  }

  async findOne(companyId: string, leavePolicyId: string) {
    const key = this.oneKey(companyId, leavePolicyId);
    this.logger.debug(
      { key, companyId, leavePolicyId },
      'leavepol:findOne:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.companyId, companyId),
            eq(this.table.id, leavePolicyId),
          ),
        )
        .execute();
      return rows[0] ?? null;
    });

    if (!row) {
      this.logger.warn(
        { companyId, leavePolicyId },
        'leavepol:findOne:not-found',
      );
      throw new NotFoundException(
        `Leave policy with id ${leavePolicyId} not found`,
      );
    }

    return row;
  }

  async findAllAccrualPolicies(companyId?: string) {
    const key = companyId ? this.accrualListKey(companyId, true) : undefined;
    if (key)
      this.logger.debug({ key, companyId }, 'leavepol:accrual:on:cache:get');

    const getter = async () => {
      const where = companyId
        ? and(
            eq(this.table.accrualEnabled, true),
            eq(this.table.companyId, companyId),
          )
        : and(eq(this.table.accrualEnabled, true));
      const rows = await this.db
        .select()
        .from(this.table)
        .where(where)
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'leavepol:accrual:on:db:done',
      );
      return rows;
    };

    return key ? this.cache.getOrSetCache(key, getter) : getter();
  }

  findAllNonAccrualPolicies(companyId?: string) {
    const key = companyId ? this.accrualListKey(companyId, false) : undefined;
    if (key)
      this.logger.debug({ key, companyId }, 'leavepol:accrual:off:cache:get');

    const getter = async () => {
      const where = companyId
        ? and(
            eq(leavePolicies.accrualEnabled, false),
            eq(this.table.companyId, companyId),
          )
        : eq(leavePolicies.accrualEnabled, false);
      const rows = await this.db
        .select()
        .from(leavePolicies)
        .where(where as any)
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'leavepol:accrual:off:db:done',
      );
      return rows;
    };

    return key ? this.cache.getOrSetCache(key, getter) : getter();
  }

  // ---------- update ----------
  async update(
    leavePolicyId: string,
    dto: UpdateLeavePolicyDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;
    this.logger.info(
      { companyId, leavePolicyId, dto },
      'leavepol:update:start',
    );

    await this.findOne(companyId, leavePolicyId);

    const [leavePolicy] = await this.db
      .update(this.table)
      .set(dto)
      .where(
        and(
          eq(this.table.companyId, companyId),
          eq(this.table.id, leavePolicyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'leave_policy',
      entityId: leavePolicy.id,
      details: 'Updated leave policy',
      userId: id,
      ipAddress: ip,
      changes: { ...dto },
    });

    await this.burst({
      companyId,
      id: leavePolicyId,
      leaveTypeId: leavePolicy.leaveTypeId,
    });
    this.logger.info({ id: leavePolicyId }, 'leavepol:update:done');
    return leavePolicy;
  }

  // ---------- delete ----------
  async remove(leavePolicyId: string, user: User, ip: string) {
    const { companyId, id } = user;
    this.logger.info({ companyId, leavePolicyId }, 'leavepol:delete:start');

    const existing = await this.findOne(companyId, leavePolicyId);

    await this.db
      .delete(this.table)
      .where(
        and(
          eq(this.table.companyId, companyId),
          eq(this.table.id, leavePolicyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'leave_policy',
      entityId: leavePolicyId,
      details: 'Deleted leave policy',
      userId: id,
      ipAddress: ip,
    });

    await this.burst({
      companyId,
      id: leavePolicyId,
      leaveTypeId: existing.leaveTypeId,
    });
    this.logger.info({ id: leavePolicyId }, 'leavepol:delete:done');
    return { message: 'Leave policy deleted successfully' };
  }
}
