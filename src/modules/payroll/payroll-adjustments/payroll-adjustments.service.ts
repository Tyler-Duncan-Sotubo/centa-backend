import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePayrollAdjustmentDto } from './dto/create-payroll-adjustment.dto';
import { UpdatePayrollAdjustmentDto } from './dto/update-payroll-adjustment.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq } from 'drizzle-orm';
import { payrollAdjustments } from '../schema/payroll-adjustments.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PayrollAdjustmentsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
    private cache: CacheService,
  ) {}

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  async create(dto: CreatePayrollAdjustmentDto, user: User) {
    const [created] = await this.db
      .insert(payrollAdjustments)
      .values({
        companyId: user.companyId,
        employeeId: dto.employeeId,
        payrollDate: new Date(dto.payrollDate).toISOString(),
        amount: dto.amount,
        type: dto.type,
        label: dto.label,
        taxable: dto.taxable ?? true,
        proratable: dto.proratable ?? false,
        recurring: dto.recurring ?? false,
        notes: dto.notes ?? '',
        createdBy: user.id,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'payrollAdjustment',
      entityId: created.id,
      userId: user.id,
      details: 'Created new payroll adjustment',
      changes: {
        employeeId: dto.employeeId,
        payrollDate: dto.payrollDate,
        amount: dto.amount,
        type: dto.type,
        label: dto.label,
        taxable: dto.taxable ?? true,
        proratable: dto.proratable ?? false,
        recurring: dto.recurring ?? false,
        notes: dto.notes ?? '',
      },
    });

    // Invalidate/bump cache
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'payrollAdjustments',
      `company:${user.companyId}:payrollAdjustments`,
      `payrollAdjustment:${created.id}`,
    ]);

    return created;
  }

  // ---------------------------------------------------------------------------
  // Read: list (versioned cache)
  // ---------------------------------------------------------------------------
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payrollAdjustments', 'list'],
      async () => {
        return this.db
          .select()
          .from(payrollAdjustments)
          .where(
            and(
              eq(payrollAdjustments.companyId, companyId),
              eq(payrollAdjustments.isDeleted, false),
            ),
          )
          .execute();
      },
      {
        tags: ['payrollAdjustments', `company:${companyId}:payrollAdjustments`],
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Read: single (versioned cache)
  // ---------------------------------------------------------------------------
  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['payrollAdjustments', 'byId', id],
      async () => {
        const [record] = await this.db
          .select()
          .from(payrollAdjustments)
          .where(
            and(
              eq(payrollAdjustments.id, id),
              eq(payrollAdjustments.companyId, companyId),
              eq(payrollAdjustments.isDeleted, false),
            ),
          )
          .execute();

        if (!record)
          throw new NotFoundException('Payroll adjustment not found');
        return record;
      },
      {
        tags: [
          'payrollAdjustments',
          `company:${companyId}:payrollAdjustments`,
          `payrollAdjustment:${id}`,
        ],
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  async update(id: string, dto: UpdatePayrollAdjustmentDto, user: User) {
    // Warm/validate
    await this.findOne(id, user.companyId);

    const [updated] = await this.db
      .update(payrollAdjustments)
      .set({
        amount: dto.amount,
        label: dto.label,
        notes: dto.notes,
        taxable: dto.taxable,
        proratable: dto.proratable,
        recurring: dto.recurring,
        type: dto.type,
        payrollDate: dto.payrollDate
          ? new Date(dto.payrollDate).toISOString()
          : undefined,
      })
      .where(
        and(
          eq(payrollAdjustments.id, id),
          eq(payrollAdjustments.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    if (!updated)
      throw new BadRequestException('Unable to update payroll adjustment');

    await this.auditService.logAction({
      action: 'update',
      entity: 'payrollAdjustment',
      entityId: id,
      userId: user.id,
      details: 'Updated payroll adjustment',
      changes: {
        amount: dto.amount,
        label: dto.label,
        notes: dto.notes,
        taxable: dto.taxable,
        proratable: dto.proratable,
        recurring: dto.recurring,
        type: dto.type,
        payrollDate: dto.payrollDate,
      },
    });

    // Invalidate/bump cache
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'payrollAdjustments',
      `company:${user.companyId}:payrollAdjustments`,
      `payrollAdjustment:${id}`,
    ]);

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Remove (soft delete)
  // ---------------------------------------------------------------------------
  async remove(id: string, user: User) {
    // Warm/validate
    await this.findOne(id, user.companyId);

    const [result] = await this.db
      .update(payrollAdjustments)
      .set({ isDeleted: true })
      .where(
        and(
          eq(payrollAdjustments.id, id),
          eq(payrollAdjustments.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'payrollAdjustment',
      entityId: id,
      userId: user.id,
      details: 'Soft-deleted payroll adjustment',
      changes: { isDeleted: true },
    });

    // Invalidate/bump cache
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'payrollAdjustments',
      `company:${user.companyId}:payrollAdjustments`,
      `payrollAdjustment:${id}`,
    ]);

    return result;
  }
}
