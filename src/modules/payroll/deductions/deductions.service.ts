import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
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

@Injectable()
export class DeductionsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private cache: CacheService,
    private auditService: AuditService,
  ) {}

  // Deduction Types
  async getDeductionTypes() {
    const allDeductionTypes = await this.db
      .select()
      .from(deductionTypes)
      .execute();

    return allDeductionTypes;
  }

  async findDeductionType(id: string) {
    const deductionType = await this.db
      .select()
      .from(deductionTypes)
      .where(eq(deductionTypes.id, id))
      .execute();

    if (!deductionType)
      throw new BadRequestException('Deduction type not found');

    return deductionType[0];
  }

  async createDeductionType(user: User, dto: CreateDeductionTypeDto) {
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

    // log the creation
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

    return created;
  }

  async updateDeductionType(
    user: User,
    dto: CreateDeductionTypeDto,
    id: string,
  ) {
    // find the deduction type
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

    // log the update
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

    return updated;
  }

  async deleteDeductionType(id: string, userId: string) {
    // find the deduction type
    await this.findDeductionType(id);

    // delete the deduction type
    const [deleted] = await this.db
      .update(deductionTypes)
      .set({
        systemDefined: false,
      })
      .where(eq(deductionTypes.id, id))
      .returning({
        id: deductionTypes.id,
        name: deductionTypes.name,
        code: deductionTypes.code,
      })
      .execute();

    // log the deletion
    await this.auditService.logAction({
      action: 'delete',
      entity: 'deduction_type',
      entityId: deleted.id,
      userId,
      details: `Deduction type with ID ${id} was deleted.`,
      changes: {
        systemDefined: false,
      },
    });

    return 'Deduction type deleted successfully';
  }

  // Employee deductions
  async getEmployeeDeductions(employeeId: string) {
    const deductions = await this.db
      .select()
      .from(employeeDeductions)
      .where(eq(employeeDeductions.employeeId, employeeId))
      .execute();

    if (deductions.length === 0) {
      throw new BadRequestException('No deductions found for this employee');
    }

    return deductions;
  }

  async assignDeductionToEmployee(user: User, dto: CreateEmployeeDeductionDto) {
    // Optional: Validate deductionTypeId exists and is active
    const [deductionType] = await this.db
      .select()
      .from(deductionTypes)
      .where(eq(deductionTypes.id, dto.deductionTypeId))
      .execute();

    if (!deductionType) {
      throw new BadRequestException('Deduction type does not exist');
    }

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

    return { message: 'Employee deduction deactivated successfully' };
  }

  async getAllEmployeeDeductionsForCompany(companyId: string) {
    const result = await this.db
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

    return result;
  }

  async processVoluntaryDeductionsFromPayroll(
    payrollRecords: any[], // each record includes voluntaryDeductions
    payrollRunId: string,
    companyId: string,
  ) {
    // Step 1: Get deduction type names
    const deductionType = await this.db
      .select({ id: deductionTypes.id, name: deductionTypes.name })
      .from(deductionTypes)
      .execute();

    const deductionTypeMap = new Map<string, string>();
    for (const dt of deductionType) {
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
          payrollMonth: record.payrollMonth.toString(),
          amount: amt.toFixed(2),
          companyId,
        });
      }
    }

    // Step 3: Bulk insert
    if (allRows.length > 0) {
      await this.db.insert(filingVoluntaryDeductions).values(allRows).execute();
    }

    return { inserted: allRows.length };
  }
}
