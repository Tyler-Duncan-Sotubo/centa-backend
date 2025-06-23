import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePayrollOverrideDto } from './dto/create-payroll-override.dto';
import { UpdatePayrollOverrideDto } from './dto/update-payroll-override.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and } from 'drizzle-orm';
import { payrollOverrides } from '../schema/payroll-overrides.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';

@Injectable()
export class PayrollOverridesService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
  ) {}

  async create(dto: CreatePayrollOverrideDto, user: User) {
    const [created] = await this.db
      .insert(payrollOverrides)
      .values({
        companyId: user.companyId,
        employeeId: dto.employeeId,
        payrollDate: new Date(dto.payrollDate).toDateString(),
        forceInclude: dto.forceInclude ?? false,
        notes: dto.notes ?? '',
      })
      .returning();

    // Audit the creation
    await this.auditService.logAction({
      action: 'create',
      entity: 'payrollOverride',
      entityId: created.id,
      details: 'Created new payroll override',
      userId: user.id,
      changes: {
        employeeId: dto.employeeId,
        payrollDate: dto.payrollDate,
        forceInclude: dto.forceInclude,
        notes: dto.notes,
      },
    });

    return created;
  }

  async findAll(companyId: string) {
    return this.db
      .select()
      .from(payrollOverrides)
      .where(eq(payrollOverrides.companyId, companyId));
  }

  async findOne(id: string, companyId: string) {
    const [record] = await this.db
      .select()
      .from(payrollOverrides)
      .where(
        and(
          eq(payrollOverrides.id, id),
          eq(payrollOverrides.companyId, companyId),
        ),
      );

    if (!record) throw new NotFoundException('Override not found');

    return record;
  }

  async update(id: string, dto: UpdatePayrollOverrideDto, user: User) {
    await this.findOne(id, user.companyId);

    const result = await this.db
      .update(payrollOverrides)
      .set({
        forceInclude: dto.forceInclude,
        notes: dto.notes,
        payrollDate: dto.payrollDate
          ? new Date(dto.payrollDate).toISOString()
          : undefined,
      })
      .where(eq(payrollOverrides.id, id))
      .returning();

    // Audit the update
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

    return result[0];
  }
}
