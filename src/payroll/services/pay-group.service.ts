import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { employees } from 'src/drizzle/schema/employee.schema';
import { eq } from 'drizzle-orm';
import { CreateEmployeeGroupDto } from '../dto/create-employee-group.dto';
import { UpdateEmployeeGroupDto } from '../dto/update-employee-group.dto';
import { payGroups } from 'src/drizzle/schema/payroll.schema';
import { paySchedules } from 'src/drizzle/schema/company.schema';
import { OnboardingService } from 'src/organization/services/onboarding.service';

@Injectable()
export class PayGroupService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly onboardingService: OnboardingService,
  ) {}
  async getEmployeeById(employee_id: string) {
    const result = await this.db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    if (result.length === 0) {
      throw new BadRequestException(
        'Employee not found, please provide a valid employee id',
      );
    }

    return result[0];
  }

  // Employee Group Service ---------------------------------------------------
  async getEmployeeGroups(company_id: string) {
    const result = await this.db
      .select({
        id: payGroups.id,
        name: payGroups.name,
        pay_schedule_id: payGroups.pay_schedule_id,
        apply_nhf: payGroups.apply_nhf,
        apply_pension: payGroups.apply_pension,
        apply_paye: payGroups.apply_paye,
        apply_additional: payGroups.apply_additional,
        payFrequency: paySchedules.payFrequency,
        createdAt: payGroups.createdAt,
      })
      .from(payGroups)
      .innerJoin(paySchedules, eq(payGroups.pay_schedule_id, paySchedules.id))
      .where(eq(payGroups.company_id, company_id))
      .execute();

    return result;
  }

  async createEmployeeGroup(company_id: string, dto: CreateEmployeeGroupDto) {
    console.log(dto);
    const result = await this.db
      .insert(payGroups)
      .values({
        ...dto,
        name: dto.name.toLowerCase(),
        company_id: company_id,
      })
      .returning()
      .execute();

    if (dto.employees && dto.employees.length > 0) {
      await this.addEmployeesToGroup(dto.employees, result[0].id);
    }

    await this.onboardingService.completeTask(company_id, 'setupPayGroups');

    return result[0];
  }

  async getEmployeeGroup(group_id: string) {
    const result = await this.db
      .select()
      .from(payGroups)
      .where(eq(payGroups.id, group_id))
      .execute();

    if (result.length === 0) {
      throw new BadRequestException(
        'Employee group not found, please provide a valid group id',
      );
    }

    return result[0];
  }

  async updateEmployeeGroup(group_id: string, dto: UpdateEmployeeGroupDto) {
    await this.getEmployeeGroup(group_id);

    await this.db
      .update(payGroups)
      .set({
        ...dto,
      })
      .where(eq(payGroups.id, group_id))
      .execute();

    return 'Employee group updated successfully';
  }

  async deleteEmployeeGroup(group_id: string) {
    const result = await this.db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(eq(employees.group_id, group_id))
      .execute();

    await this.removeEmployeesFromGroup(result.map((employee) => employee.id));

    await this.db.delete(payGroups).where(eq(payGroups.id, group_id)).execute();

    return { message: 'Employee group deleted successfully' };
  }

  async getEmployeesInGroup(group_id: string) {
    const result = await this.db
      .select({
        id: employees.id,
        first_name: employees.first_name,
        last_name: employees.last_name,
      })
      .from(employees)
      .where(eq(employees.group_id, group_id))
      .execute();

    if (result.length === 0) {
      throw new BadRequestException('No employees found in this group');
    }

    return result;
  }

  // Add Employees to a Group (supports both single and multiple employee IDs)
  async addEmployeesToGroup(employee_ids: string | string[], group_id: string) {
    // Ensure employee_ids is always an array
    const employeeIdArray = Array.isArray(employee_ids)
      ? employee_ids
      : [employee_ids];

    // Validate that each employee exists
    for (const employee_id of employeeIdArray) {
      await this.getEmployeeById(employee_id); // Ensure each employee exists
    }

    // Update all employees in the array to belong to the given group
    const updatePromises = employeeIdArray.map((employee_id) =>
      this.db
        .update(employees)
        .set({ group_id: group_id })
        .where(eq(employees.id, employee_id))
        .execute(),
    );

    await Promise.all(updatePromises); // Wait for all updates to complete

    return `${employeeIdArray.length} employees added to group ${group_id} successfully`;
  }

  async removeEmployeesFromGroup(employee_ids: string | string[]) {
    // Ensure employee_ids is always an array
    const employeeIdArray = Array.isArray(employee_ids)
      ? employee_ids
      : [employee_ids];

    // Validate that each employee exists
    for (const employee_id of employeeIdArray) {
      await this.getEmployeeById(employee_id); // Ensure each employee exists
    }

    // Update all employees in the array to set group_id to null (removing them from the group)
    const updatePromises = employeeIdArray.map((employee_id) =>
      this.db
        .update(employees)
        .set({ group_id: null }) // Remove the employee from the group
        .where(eq(employees.id, employee_id))
        .execute(),
    );

    await Promise.all(updatePromises); // Wait for all updates to complete

    return `${employeeIdArray.length} employees removed from the group successfully`;
  }
}
