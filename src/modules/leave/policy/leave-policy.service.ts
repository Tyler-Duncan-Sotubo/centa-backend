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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeavePolicyService {
  protected readonly table = leavePolicies;

  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:leave`,
      `company:${companyId}:leave:policies`,
    ];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BULK CREATE
  // ───────────────────────────────────────────────────────────────────────────
  async bulkCreateLeavePolicies(companyId: string, rows: any[]) {
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
        throw new BadRequestException(
          `Leave type "${leaveTypeName}" not found.`,
        );
      }

      const normalizeBool = (val: any) => String(val).toLowerCase() === 'true';

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

    // Invalidate all versioned policy reads for this company
    await this.cache.bumpCompanyVersion(companyId);

    return inserted;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATE
  // ───────────────────────────────────────────────────────────────────────────
  async create(
    leaveTypeId: string,
    dto: CreateLeavePolicyDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;

    // 1. Duplicate check (company + leaveType)
    const existing = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.companyId, companyId),
          eq(this.table.leaveTypeId, leaveTypeId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException(
        `Leave policy for leave type ${leaveTypeId} already exists`,
      );
    }

    // 2. Create
    const [leavePolicy] = await this.db
      .insert(this.table)
      .values({ leaveTypeId, companyId, ...dto })
      .returning()
      .execute();

    // 3. Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'leave_policy',
      entityId: leavePolicy.id,
      details: 'Created new leave policy',
      userId: id,
      ipAddress: ip,
      changes: { leaveTypeId, companyId, ...dto },
    });

    // 4. Invalidate
    await this.cache.bumpCompanyVersion(companyId);

    return leavePolicy;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // READS (CACHED)
  // ───────────────────────────────────────────────────────────────────────────
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'policies', 'list'],
      async () => {
        return this.db
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
      },
      { tags: this.tags(companyId) },
    );
  }

  async findLeavePoliciesByLeaveTypeId(companyId: string, leaveTypeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'policies', 'by-leave-type', leaveTypeId],
      async () => {
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

        if (rows.length === 0) {
          throw new NotFoundException(
            `Leave policy with leave type id ${leaveTypeId} not found`,
          );
        }
        return rows[0];
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(companyId: string, leavePolicyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'policies', 'one', leavePolicyId],
      async () => {
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

        if (rows.length === 0) {
          throw new NotFoundException(
            `Leave policy with id ${leavePolicyId} not found`,
          );
        }
        return rows[0];
      },
      { tags: this.tags(companyId) },
    );
  }

  async findAllAccrualPolicies(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'policies', 'accrual-enabled'],
      async () => {
        return this.db
          .select()
          .from(this.table)
          .where(
            and(
              eq(this.table.accrualEnabled, true),
              eq(this.table.companyId, companyId),
            ),
          )
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async findAllNonAccrualPolicies(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'policies', 'accrual-disabled'],
      async () => {
        return this.db
          .select()
          .from(this.table)
          .where(
            and(
              eq(this.table.accrualEnabled, false),
              eq(this.table.companyId, companyId),
            ),
          )
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UPDATE / DELETE (invalidate)
  // ───────────────────────────────────────────────────────────────────────────
  async update(
    leavePolicyId: string,
    dto: UpdateLeavePolicyDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;

    // ensure exists
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

    await this.cache.bumpCompanyVersion(companyId);

    return leavePolicy;
  }

  async remove(leavePolicyId: string, user: User, ip: string) {
    const { companyId, id } = user;

    // ensure exists
    await this.findOne(companyId, leavePolicyId);

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

    await this.cache.bumpCompanyVersion(companyId);
  }
}
