import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePayrollOverrideDto } from './dto/create-payroll-override.dto';
import { UpdatePayrollOverrideDto } from './dto/update-payroll-override.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, eq } from 'drizzle-orm';
import { payrollOverrides } from '../schema/payroll-overrides.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PayrollOverridesService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
    private cache: CacheService,
  ) {}

  // -----------------------------
  // Create
  // -----------------------------
  async create(dto: CreatePayrollOverrideDto, user: User) {
    const [created] = await this.db
      .insert(payrollOverrides)
      .values({
        companyId: user.companyId,
        employeeId: dto.employeeId,
        payrollDate: new Date(dto.payrollDate).toISOString(),
        forceInclude: dto.forceInclude ?? false,
        notes: dto.notes ?? '',
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'payrollOverride',
      entityId: created.id,
      details: 'Created new payroll override',
      userId: user.id,
      changes: {
        employeeId: dto.employeeId,
        payrollDate: dto.payrollDate,
        forceInclude: dto.forceInclude ?? false,
        notes: dto.notes ?? '',
      },
    });

    // bump/invalidate caches
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'payrollOverrides',
      `company:${user.companyId}:payrollOverrides`,
      `payrollOverride:${created.id}`,
    ]);

    return created;
  }

  // -----------------------------
  // Read: list (versioned cache)
  // -----------------------------
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payrollOverrides', 'list'],
      async () => {
        return this.db
          .select()
          .from(payrollOverrides)
          .where(eq(payrollOverrides.companyId, companyId))
          .execute();
      },
      { tags: ['payrollOverrides', `company:${companyId}:payrollOverrides`] },
    );
  }

  // -----------------------------
  // Read: single (versioned cache)
  // -----------------------------
  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payrollOverrides', 'byId', id],
      async () => {
        const [record] = await this.db
          .select()
          .from(payrollOverrides)
          .where(
            and(
              eq(payrollOverrides.id, id),
              eq(payrollOverrides.companyId, companyId),
            ),
          )
          .execute();

        if (!record) throw new NotFoundException('Override not found');
        return record;
      },
      {
        tags: [
          'payrollOverrides',
          `company:${companyId}:payrollOverrides`,
          `payrollOverride:${id}`,
        ],
      },
    );
  }

  // -----------------------------
  // Update
  // -----------------------------
  async update(id: string, dto: UpdatePayrollOverrideDto, user: User) {
    // ensure it exists (and warms cache)
    await this.findOne(id, user.companyId);

    const [updated] = await this.db
      .update(payrollOverrides)
      .set({
        forceInclude: dto.forceInclude,
        notes: dto.notes,
        payrollDate: dto.payrollDate
          ? new Date(dto.payrollDate).toISOString()
          : undefined,
      })
      .where(
        and(
          eq(payrollOverrides.id, id),
          eq(payrollOverrides.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new BadRequestException('Unable to update payroll override');
    }

    await this.auditService.logAction({
      action: 'update',
      entity: 'payrollOverride',
      entityId: id,
      userId: user.id,
      details: 'Updated payroll override',
      changes: {
        forceInclude: dto.forceInclude,
        notes: dto.notes,
        payrollDate: dto.payrollDate,
      },
    });

    // bump/invalidate caches
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'payrollOverrides',
      `company:${user.companyId}:payrollOverrides`,
      `payrollOverride:${id}`,
    ]);

    return updated;
  }
}
