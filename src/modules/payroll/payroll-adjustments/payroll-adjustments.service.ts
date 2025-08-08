import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePayrollAdjustmentDto } from './dto/create-payroll-adjustment.dto';
import { UpdatePayrollAdjustmentDto } from './dto/update-payroll-adjustment.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and } from 'drizzle-orm';
import { payrollAdjustments } from '../schema/payroll-adjustments.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';

@Injectable()
export class PayrollAdjustmentsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
  ) {}

  async create(dto: CreatePayrollAdjustmentDto, user: User) {
    const [created] = await this.db
      .insert(payrollAdjustments)
      .values({
        companyId: user.companyId,
        employeeId: dto.employeeId,
        payrollDate: new Date(dto.payrollDate).toDateString(),
        amount: dto.amount,
        type: dto.type,
        label: dto.label,
        taxable: dto.taxable ?? true,
        proratable: dto.proratable ?? false,
        recurring: dto.recurring ?? false,
        notes: dto.notes ?? '',
        createdBy: user.id,
      })
      .returning();

    // Audit the creation
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
        taxable: dto.taxable,
        proratable: dto.proratable,
        recurring: dto.recurring,
        notes: dto.notes,
      },
    });

    return created;
  }

  async findAll(companyId: string) {
    return this.db
      .select()
      .from(payrollAdjustments)
      .where(eq(payrollAdjustments.companyId, companyId));
  }

  async findOne(id: string, companyId: string) {
    const [record] = await this.db
      .select()
      .from(payrollAdjustments)
      .where(
        and(
          eq(payrollAdjustments.id, id),
          eq(payrollAdjustments.companyId, companyId),
        ),
      );

    if (!record) throw new NotFoundException('Payroll adjustment not found');
    return record;
  }

  async update(id: string, dto: UpdatePayrollAdjustmentDto, user: User) {
    // Check if the record exists
    await this.findOne(id, user.companyId);

    // Update the record
    const result = await this.db
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
      .where(eq(payrollAdjustments.id, id))
      .returning();

    // Audit the update
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

    return result[0];
  }

  async remove(id: string, user: User) {
    // Check if the record exists
    await this.findOne(id, user.companyId);

    // soft delete
    const result = await this.db
      .update(payrollAdjustments)
      .set({
        isDeleted: true,
      })
      .where(
        and(
          eq(payrollAdjustments.id, id),
          eq(payrollAdjustments.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    return result[0];
  }
}
