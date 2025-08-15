import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { employees } from 'src/drizzle/schema';
import { eq, sql, and } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import {
  deductionTypes,
  employeeDeductions,
  filingVoluntaryDeductions,
} from '../schema/deduction.schema';
import { CreateDeductionTypeDto } from './dto/create-deduction-type.dto';
import { UpdateEmployeeDeductionDto } from './dto/update-employee-deduction.dto';
import { CreateEmployeeDeductionDto } from './dto/create-employee-deduction.dto';
import Decimal from 'decimal.js';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class DeductionsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
    private cache: CacheService,
  ) {}

  // ----------------------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------------------
  private async getCompanyIdByEmployeeId(employeeId: string): Promise<string> {
    const [row] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .execute();

    if (!row?.companyId) {
      throw new BadRequestException('Employee not found');
    }
    return row.companyId;
  }

  private async getCompanyIdByEmployeeDeductionId(
    id: string,
  ): Promise<{ companyId: string; employeeId: string }> {
    const [row] = await this.db
      .select({
        employeeId: employeeDeductions.employeeId,
      })
      .from(employeeDeductions)
      .where(eq(employeeDeductions.id, id))
      .limit(1)
      .execute();

    if (!row?.employeeId) {
      throw new BadRequestException('Deduction not found');
    }

    const companyId = await this.getCompanyIdByEmployeeId(row.employeeId);
    return { companyId, employeeId: row.employeeId };
  }

  // ----------------------------------------------------------------------------
  // Deduction Types (global-scoped; use a synthetic "global" company key)
  // ----------------------------------------------------------------------------
  async getDeductionTypes() {
    return this.cache.getOrSetVersioned(
      'global',
      ['deductionTypes', 'all'],
      async () => {
        return await this.db.select().from(deductionTypes).execute();
      },
      { tags: ['deductionTypes'] },
    );
  }

  async findDeductionType(id: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['deductionType', id],
      async () => {
        const rows = await this.db
          .select()
          .from(deductionTypes)
          .where(eq(deductionTypes.id, id))
          .execute();

        if (!rows.length) {
          throw new BadRequestException('Deduction type not found');
        }
        return rows[0];
      },
      { tags: ['deductionTypes', `deductionType:${id}`] },
    );
  }

  async createDeductionType(dto: CreateDeductionTypeDto, user?: User) {
    const [created] = await this.db
      .insert(deductionTypes)
      .values({
        name: dto.name,
        code: dto.code,
        systemDefined: dto.systemDefined,
        requiresMembership: dto.requiresMembership,
      })
      .returning({
        id: deductionTypes.id,
        name: deductionTypes.name,
        code: deductionTypes.code,
      })
      .execute();

    if (user?.id) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'deduction_type',
        entityId: created.id,
        userId: user.id,
        details: `Deduction type with ID ${created.id} was created.`,
        changes: {
          name: dto.name,
          code: dto.code,
          systemDefined: dto.systemDefined,
          requiresMembership: dto.requiresMembership,
        },
      });
    }

    // Invalidate global caches
    await this.cache.bumpCompanyVersion('global');
    await this.cache.invalidateTags(['deductionTypes']);

    return created;
  }

  async updateDeductionType(
    user: User,
    dto: CreateDeductionTypeDto,
    id: string,
  ) {
    // ensure present (cached)
    await this.findDeductionType(id);

    const [updated] = await this.db
      .update(deductionTypes)
      .set({
        name: dto.name,
        code: dto.code,
        systemDefined: dto.systemDefined,
        requiresMembership: dto.requiresMembership,
      })
      .where(eq(deductionTypes.id, id))
      .returning({
        id: deductionTypes.id,
        name: deductionTypes.name,
        code: deductionTypes.code,
      })
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'deduction_type',
      entityId: id,
      userId: user.id,
      details: `Deduction type with ID ${id} was updated.`,
      changes: {
        name: dto.name,
        code: dto.code,
        systemDefined: dto.systemDefined,
        requiresMembership: dto.requiresMembership,
      },
    });

    await this.cache.bumpCompanyVersion('global');
    await this.cache.invalidateTags(['deductionTypes', `deductionType:${id}`]);

    return updated;
  }

  async deleteDeductionType(id: string, userId: string) {
    // ensure present (cached)
    await this.findDeductionType(id);

    const [deleted] = await this.db
      .update(deductionTypes)
      .set({ systemDefined: false })
      .where(eq(deductionTypes.id, id))
      .returning({
        id: deductionTypes.id,
        name: deductionTypes.name,
        code: deductionTypes.code,
      })
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'deduction_type',
      entityId: deleted.id,
      userId,
      details: `Deduction type with ID ${id} was deleted.`,
      changes: { systemDefined: false },
    });

    await this.cache.bumpCompanyVersion('global');
    await this.cache.invalidateTags(['deductionTypes', `deductionType:${id}`]);

    return 'Deduction type deleted successfully';
  }

  // ----------------------------------------------------------------------------
  // Employee Deductions (company-scoped)
  // ----------------------------------------------------------------------------
  async getEmployeeDeductions(employeeId: string) {
    const companyId = await this.getCompanyIdByEmployeeId(employeeId);

    const list = await this.cache.getOrSetVersioned(
      companyId,
      ['employee', employeeId, 'deductions', 'all'],
      async () => {
        return await this.db
          .select()
          .from(employeeDeductions)
          .where(eq(employeeDeductions.employeeId, employeeId))
          .execute();
      },
      { tags: [`employee:${employeeId}:deductions`, 'deductions:company'] },
    );

    if (!list.length) {
      throw new BadRequestException('No deductions found for this employee');
    }

    return list;
  }

  async assignDeductionToEmployee(user: User, dto: CreateEmployeeDeductionDto) {
    // Validate type exists (cached)
    await this.findDeductionType(dto.deductionTypeId);

    const [created] = await this.db
      .insert(employeeDeductions)
      .values({
        employeeId: dto.employeeId,
        deductionTypeId: dto.deductionTypeId,
        rateType: dto.rateType,
        rateValue: dto.rateValue,
        startDate: dto.startDate,
        endDate: dto.endDate,
        metadata: dto.metadata ?? {},
        isActive: dto.isActive ?? true,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'employee_deduction',
      entityId: created.id,
      userId: user.id,
      details: `Employee deduction assigned to ${dto.employeeId}`,
      changes: dto,
    });

    // Cache invalidation
    const companyId = await this.getCompanyIdByEmployeeId(dto.employeeId);
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.invalidateTags([
      'deductions:company',
      `employee:${dto.employeeId}:deductions`,
    ]);

    return created;
  }

  async updateEmployeeDeduction(
    user: User,
    id: string,
    dto: UpdateEmployeeDeductionDto,
  ) {
    const existing = await this.db
      .select()
      .from(employeeDeductions)
      .where(eq(employeeDeductions.id, id))
      .execute();

    if (!existing.length) throw new BadRequestException('Deduction not found');

    const [updated] = await this.db
      .update(employeeDeductions)
      .set({
        rateType: dto.rateType,
        rateValue: dto.rateValue,
        startDate: dto.startDate,
        endDate: dto.endDate,
        metadata: dto.metadata,
        isActive: dto.isActive,
      })
      .where(eq(employeeDeductions.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'employee_deduction',
      entityId: updated.id,
      userId: user.id,
      details: `Updated employee deduction ${updated.id}`,
      changes: dto,
    });

    // Invalidate caches
    const { companyId, employeeId } =
      await this.getCompanyIdByEmployeeDeductionId(id);
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.invalidateTags([
      'deductions:company',
      `employee:${employeeId}:deductions`,
    ]);

    return updated;
  }

  async removeEmployeeDeduction(id: string, userId: string) {
    const [updated] = await this.db
      .update(employeeDeductions)
      .set({ isActive: false })
      .where(eq(employeeDeductions.id, id))
      .returning()
      .execute();

    if (!updated) throw new BadRequestException('Deduction not found');

    await this.auditService.logAction({
      action: 'delete',
      entity: 'employee_deduction',
      entityId: id,
      userId,
      details: `Deactivated deduction ${id}`,
      changes: { isActive: false },
    });

    // Invalidate caches
    const { companyId, employeeId } =
      await this.getCompanyIdByEmployeeDeductionId(id);
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.invalidateTags([
      'deductions:company',
      `employee:${employeeId}:deductions`,
    ]);

    return { message: 'Employee deduction deactivated successfully' };
  }

  async getAllEmployeeDeductionsForCompany(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['company', 'deductions', 'active', 'allEmployees'],
      async () => {
        return await this.db
          .select({
            id: employeeDeductions.id,
            employeeId: employeeDeductions.employeeId,
            rateType: employeeDeductions.rateType,
            rateValue: employeeDeductions.rateValue,
            deductionTypeName: deductionTypes.name,
            isActive: employeeDeductions.isActive,
            startDate: employeeDeductions.startDate,
            endDate: employeeDeductions.endDate,
            employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          })
          .from(employeeDeductions)
          .leftJoin(
            deductionTypes,
            eq(employeeDeductions.deductionTypeId, deductionTypes.id),
          )
          .innerJoin(employees, eq(employeeDeductions.employeeId, employees.id))
          .where(
            and(
              eq(employees.companyId, companyId),
              eq(employeeDeductions.isActive, true),
            ),
          )
          .execute();
      },
      { tags: ['deductions:company'] },
    );
  }

  // ----------------------------------------------------------------------------
  // Voluntary deductions filing (write-heavy; invalidate company-wide + employees)
  // ----------------------------------------------------------------------------
  async processVoluntaryDeductionsFromPayroll(
    payrollRecords: any[], // each record includes voluntaryDeductions
    payrollRunId: string,
    companyId: string,
  ) {
    // Step 1: Get deduction type names (cached globally)
    const types = await this.getDeductionTypes(); // uses cache
    const deductionTypeMap = new Map<string, string>();
    for (const dt of types) {
      deductionTypeMap.set(dt.id, dt.name);
    }

    const allRows: {
      employeeId: string;
      employeeName: string;
      deductionName: string;
      payrollId: string;
      payrollMonth: string;
      amount: string;
      companyId: string;
    }[] = [];

    // Step 2: Extract and transform
    for (const record of payrollRecords) {
      const voluntaryDeductions: { amount: string; typeId: string }[] =
        Array.isArray(record.voluntaryDeductions)
          ? record.voluntaryDeductions
          : [];

      if (!voluntaryDeductions.length) continue;

      for (const { amount, typeId } of voluntaryDeductions) {
        const amt = new Decimal(amount);
        if (amt.lte(0)) continue;

        const deductionName =
          deductionTypeMap.get(typeId) || `Unknown-${typeId}`;

        allRows.push({
          employeeId: record.employeeId,
          employeeName: `${record.firstName} ${record.lastName}`,
          deductionName,
          payrollId: payrollRunId,
          payrollMonth: String(record.payrollMonth),
          amount: amt.toFixed(2),
          companyId,
        });
      }
    }

    // Step 3: Bulk insert
    if (allRows.length > 0) {
      await this.db.insert(filingVoluntaryDeductions).values(allRows).execute();
    }

    // Cache invalidation (company-wide; employees impacted)
    await this.cache.bumpCompanyVersion(companyId);
    const tags = new Set<string>(['deductions:company', 'voluntary:company']);
    for (const row of allRows) {
      tags.add(`employee:${row.employeeId}:deductions`);
      tags.add(`employee:${row.employeeId}:voluntary`);
    }
    await this.cache.invalidateTags(Array.from(tags));

    return { inserted: allRows.length };
  }
}
