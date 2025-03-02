import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import {
  employee_bank_details,
  employee_groups,
  employee_tax_details,
  employees,
} from '../../drizzle/schema/employee.schema';
import { companies } from '../../drizzle/schema/company.schema';
import {
  CreateEmployeeBankDetailsDto,
  CreateEmployeeDto,
  CreateEmployeeGroupDto,
  UpdateEmployeeBankDetailsDto,
  UpdateEmployeeDto,
  UpdateEmployeeGroupDto,
} from '../dto';
import { departments } from 'src/drizzle/schema/department.schema';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { users } from 'src/drizzle/schema/users.schema';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateEmployeeTaxDetailsDto } from '../dto/create-employee-tax-details.dto';
import { UpdateEmployeeTaxDetailsDto } from '../dto/update-employee-tax-details.dto';
import { CacheService } from 'src/config/cache/cache.service';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');
import * as jwt from 'jsonwebtoken';
import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';

Injectable();
export class EmployeeService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly aws: AwsService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {}

  private generateToken(payload: any): string {
    const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
    return jwt.sign(payload, jwtSecret, {
      expiresIn: '1h',
    });
  }

  async addEmployee(dto: CreateEmployeeDto, company_id: string) {
    return this.db.transaction(async (trx) => {
      // Run company and department checks in parallel
      const [companyResult, departmentResult] = await Promise.all([
        trx
          .select()
          .from(companies)
          .where(eq(companies.id, company_id))
          .execute(),
        dto.department_id
          ? trx
              .select()
              .from(departments)
              .where(eq(departments.id, dto.department_id))
              .execute()
          : null,
      ]);

      if (companyResult.length === 0) {
        throw new BadRequestException('Company not found');
      }

      if (
        dto.department_id &&
        departmentResult &&
        departmentResult.length === 0
      ) {
        throw new BadRequestException('Department not found');
      }

      // Hash the generated password
      const randomPassword = randomBytes(12).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // check if employee number already exists
      const employeeNumberExists = await trx
        .select()
        .from(employees)
        .where(eq(employees.employee_number, dto.employee_number))
        .execute();

      if (employeeNumberExists.length > 0) {
        throw new BadRequestException(
          `Employee number ${dto.employee_number} already exists. Please use a unique employee number`,
        );
      }

      // check if email already exists
      const emailExists = await trx
        .select()
        .from(users)
        .where(eq(users.email, dto.email.toLowerCase()))
        .execute();

      if (emailExists.length > 0) {
        throw new BadRequestException(
          `Employee with email ${dto.email} already exists. Please use a unique email`,
        );
      }

      // User creation, role assignment, and employee insertion
      await trx
        .insert(users)
        .values({
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          first_name: dto.first_name,
          last_name: dto.last_name,
        })
        .returning({
          id: users.id,
        })
        .execute();

      const employee = await trx
        .insert(employees)
        .values({
          employee_number: dto.employee_number,
          first_name: dto.first_name,
          last_name: dto.last_name,
          job_title: dto.job_title,
          email: dto.email,
          phone: dto.phone,
          employment_status: dto.employment_status,
          start_date: dto.start_date,
          company_id: company_id,
          department_id: dto.department_id || null,
          annual_gross: dto.annual_gross,
          hourly_rate: dto.hourly_rate,
          bonus: dto.bonus,
          commission: dto.commission,
        })
        .returning({
          id: employees.id,
          employee_number: employees.employee_number,
          first_name: employees.first_name,
          email: employees.email,
          annual_gross: employees.annual_gross,
          hourly_rate: employees.hourly_rate,
          bonus: employees.bonus,
          commission: employees.commission,
          group_id: employees.group_id,
        })
        .execute();

      const cacheKey = `employee-${employee[0].id}`;
      this.cache.set(cacheKey, employee[0]);

      const token = this.generateToken({ email: dto.email });

      const inviteLink = `${this.config.get(
        'CLIENT_URL',
      )}/auth/reset-password/${token}`;

      await this.passwordResetEmailService.sendPasswordResetEmail(
        employee[0].email,
        employee[0].first_name,
        inviteLink,
      );

      return {
        first_name: employee[0].first_name,
        email: employee[0].email,
      };
    });
  }

  // Add multiple employees
  async addMultipleEmployees(
    dtoArray: CreateEmployeeDto[],
    company_id: string,
  ) {
    return this.db.transaction(async (trx) => {
      const results: any = [];

      // Step 1: Batch fetch existing data for validation
      const departmentIds = Array.from(
        new Set(dtoArray.map((dto) => dto.department_id).filter((id) => id)),
      );
      const emails = dtoArray.map((dto) => dto.email.toLowerCase());

      const [existingDepartments, existingUsers] = await Promise.all([
        departmentIds.length
          ? trx
              .select()
              .from(departments)
              .where(inArray(departments.id, departmentIds))
              .execute()
          : Promise.resolve([]),
        trx.select().from(users).where(inArray(users.email, emails)).execute(),
      ]);

      const departmentMap = new Map(
        existingDepartments.map((department) => [department.id, department]),
      );
      const emailSet = new Set(existingUsers.map((user) => user.email));

      for (const dto of dtoArray) {
        const lowerCaseEmail = dto.email.toLowerCase();

        // Check if email already exists
        if (emailSet.has(lowerCaseEmail)) {
          throw new BadRequestException(
            `Employee with email ${dto.email} already exists. Please use a unique email`,
          );
        }

        // Check if department exists (if provided)
        if (dto.department_id && !departmentMap.has(dto.department_id)) {
          results.push({
            email: dto.email,
            status: 'Failed',
            reason: 'Department not found',
          });
          continue;
        }

        const companyResult = await trx
          .select()
          .from(companies)
          .where(eq(companies.id, company_id))
          .execute();

        if (companyResult.length === 0) {
          throw new BadRequestException('Company not found');
        }

        const randomPassword = randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        try {
          await trx
            .insert(users)
            .values({
              email: lowerCaseEmail,
              password: hashedPassword,
              first_name: dto.first_name,
              last_name: dto.last_name,
            })
            .returning({
              id: users.id,
            })
            .execute();

          const employee = await trx
            .insert(employees)
            .values({
              employee_number: dto.employee_number,
              first_name: dto.first_name,
              last_name: dto.last_name,
              job_title: dto.job_title,
              email: dto.email,
              phone: dto.phone,
              employment_status: dto.employment_status,
              start_date: dto.start_date,
              company_id: company_id,
              department_id: dto.department_id || null,
              annual_gross: dto.annual_gross,
              hourly_rate: dto.hourly_rate,
              bonus: dto.bonus,
              commission: dto.commission,
            })
            .returning({
              id: employees.id,
              employee_number: employees.employee_number,
              first_name: employees.first_name,
              email: employees.email,
              annual_gross: employees.annual_gross,
              hourly_rate: employees.hourly_rate,
              bonus: employees.bonus,
              commission: employees.commission,
              group_id: employees.group_id,
            })
            .execute();

          results.push({
            email: employee[0].email,
            employee_number: employee[0].employee_number,
            first_name: employee[0].first_name,
            password: randomPassword,
            status: 'Success',
            company_id: companyResult[0].id,
          });

          // Add employee to the cache
          const cacheKey = `employee-${employee[0].id}`;
          this.cache.set(cacheKey, employee[0]);
        } catch (error) {
          // Check for unique constraint violation on employee_number
          if (error.message.includes('employees_employee_number_unique')) {
            throw new BadRequestException(
              `Duplicate employee number: ${dto.employee_number}. Please use a unique employee number`,
            );
          } else {
            throw new BadRequestException(
              `Error during employee creation: ' + ${error.message}`,
            );
          }
        }
      }

      this.aws.uploadCsvToS3(results[0].company_id, dtoArray);

      return results;
    });
  }

  async getEmployees(company_id: string) {
    const result = await this.db
      .select()
      .from(employees)
      .where(eq(employees.company_id, company_id))
      .execute();

    if (result.length === 0) {
      throw new BadRequestException(
        'Employee not found, please provide a valid user id',
      );
    }

    return result;
  }

  async getEmployeesSummary(company_id: string) {
    const cacheKey = `employees-summary-${company_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const result = await this.db
        .select({
          first_name: employees.first_name,
          last_name: employees.last_name,
          id: employees.id,
        })
        .from(employees)
        .where(eq(employees.company_id, company_id))
        .execute();

      if (result.length === 0) {
        throw new BadRequestException(
          'Employee not found, please provide a valid user id',
        );
      }

      return result;
    });
  }

  async getEmployeeById(employee_id: string) {
    const result = await this.db
      .select({
        first_name: employees.first_name,
        last_name: employees.last_name,
        job_title: employees.job_title,
        phone: employees.phone,
        email: employees.email,
        employment_status: employees.employment_status,
        start_date: employees.start_date,
        is_active: employees.is_active,
        employee_number: employees.employee_number,
        department_id: employees.department_id,
        annual_gross: employees.annual_gross,
        hourly_rate: employees.hourly_rate,
        bonus: employees.bonus,
        commission: employees.commission,
        group_id: employees.group_id,
        employee_bank_details: employee_bank_details,
        employee_tax_details: employee_tax_details,
      })
      .from(employees)
      .where(eq(employees.id, employee_id))
      .leftJoin(
        employee_bank_details,
        eq(employee_bank_details.employee_id, employee_id),
      )
      .leftJoin(
        employee_tax_details,
        eq(employee_tax_details.employee_id, employee_id),
      )
      .execute();

    if (result.length === 0) {
      throw new BadRequestException(
        'Employee not found, please provide a valid employee id',
      );
    }

    return result[0];
  }

  async getEmployeesByDepartment(department_id: string) {
    const cacheKey = `employees-${department_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const result = await this.db
        .select({
          first_name: employees.first_name,
          last_name: employees.last_name,
          job_title: employees.job_title,
          email: employees.email,
          employment_status: employees.employment_status,
          start_date: employees.start_date,
          is_active: employees.is_active,
        })
        .from(employees)
        .where(eq(employees.department_id, department_id))
        .execute();

      if (result.length === 0) {
        throw new BadRequestException('No employees found in this department');
      }

      return result;
    });
  }

  async updateEmployee(employee_id: string, dto: UpdateEmployeeDto) {
    await this.getEmployeeById(employee_id);
    await this.db
      .update(employees)
      .set({
        first_name: dto.first_name,
        last_name: dto.last_name,
        job_title: dto.job_title,
        employment_status: dto.employment_status,
        start_date: dto.start_date,
        department_id: dto.department_id,
        is_active: dto.is_active,
        annual_gross: dto.annual_gross,
        hourly_rate: dto.hourly_rate,
      })
      .where(eq(employees.id, employee_id))
      .execute();

    return 'Employee updated successfully';
  }

  async deleteEmployee(employee_id: string) {
    const existingEmployee = await this.getEmployeeById(employee_id);

    await this.db
      .delete(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    await this.db
      .delete(users)
      .where(eq(users.email, existingEmployee.email))
      .execute();

    return { message: 'Employee deleted successfully' };
  }

  // Employee Bank Details Service --------------------------------------------

  async addEmployeeBankDetails(
    employee_id: string,
    dto: CreateEmployeeBankDetailsDto,
  ) {
    await this.getEmployeeById(employee_id);

    const result = await this.db
      .insert(employee_bank_details)
      .values({
        employee_id: employee_id,
        ...dto,
      })
      .returning()
      .execute();

    return result[0];
  }

  async updateEmployeeBankDetails(
    employee_id: string,
    dto: UpdateEmployeeBankDetailsDto,
  ) {
    await this.getEmployeeById(employee_id);

    await this.db
      .update(employee_bank_details)
      .set({
        employee_id: employee_id,
        ...dto,
      })
      .where(eq(employee_bank_details.employee_id, employee_id))
      .execute();

    return 'Employee bank details updated successfully';
  }

  // Employee Tax Details Service ---------------------------------------------

  async addEmployeeTaxDetails(
    employee_id: string,
    dto: CreateEmployeeTaxDetailsDto,
  ) {
    await this.getEmployeeById(employee_id);

    const result = await this.db
      .insert(employee_tax_details)
      .values({
        employee_id: employee_id,
        ...dto,
      })
      .returning()
      .execute();

    return result[0];
  }

  async updateEmployeeTaxDetails(
    employee_id: string,
    dto: UpdateEmployeeTaxDetailsDto,
  ) {
    await this.getEmployeeById(employee_id);

    await this.db
      .update(employee_tax_details)
      .set({
        employee_id: employee_id,
        ...dto,
      })
      .where(eq(employee_tax_details.employee_id, employee_id))
      .execute();

    return 'Employee tax details updated successfully';
  }

  // Employee Group Service ---------------------------------------------------
  async getEmployeeGroups(company_id: string) {
    const result = await this.db
      .select()
      .from(employee_groups)
      .where(eq(employee_groups.company_id, company_id))
      .execute();

    return result;
  }

  async createEmployeeGroup(company_id: string, dto: CreateEmployeeGroupDto) {
    const result = await this.db
      .insert(employee_groups)
      .values({
        ...dto,
        company_id: company_id,
      })
      .returning()
      .execute();

    if (dto.employees && dto.employees.length > 0) {
      await this.addEmployeesToGroup(dto.employees, result[0].id);
    }

    const cacheKey = `employee-group-${result[0].id}`;
    this.cache.set(cacheKey, result[0]);

    return result[0];
  }

  async getEmployeeGroup(group_id: string) {
    const cacheKey = `employee-group-${group_id}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      const result = await this.db
        .select()
        .from(employee_groups)
        .where(eq(employee_groups.id, group_id))
        .execute();

      if (result.length === 0) {
        throw new BadRequestException(
          'Employee group not found, please provide a valid group id',
        );
      }

      return result[0];
    });
  }

  async updateEmployeeGroup(group_id: string, dto: UpdateEmployeeGroupDto) {
    await this.getEmployeeGroup(group_id);

    await this.db
      .update(employee_groups)
      .set({
        ...dto,
      })
      .where(eq(employee_groups.id, group_id))
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

    await this.db
      .delete(employee_groups)
      .where(eq(employee_groups.id, group_id))
      .execute();

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
    // Update the cache for each employee
    const cacheUpdatePromises = employeeIdArray.map(async (employeeId) => {
      const cacheKey = `employee-${employeeId}`; //  Cache key for the employee
      this.cache.del(cacheKey); // Remove the employee from the cache
      const employeeData = await this.getEmployeeById(employeeId); // Fetch the updated employee data
      return this.cache.set(cacheKey, employeeData);
    });

    await Promise.all(cacheUpdatePromises);

    return `${employeeIdArray.length} employees added to group ${group_id} successfully`;
  }

  async removeEmployeesFromGroup(employee_ids: string | string[]) {
    console.log(employee_ids);
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

    const cacheUpdatePromises = employeeIdArray.map(async (employeeId) => {
      const cacheKey = `employee-${employeeId}`; //  Cache key for the employee
      this.cache.del(cacheKey); // Remove the employee from the cache
      const employeeData = await this.getEmployeeById(employeeId); // Fetch the updated employee data
      return this.cache.set(cacheKey, employeeData);
    });

    await Promise.all(cacheUpdatePromises);

    return `${employeeIdArray.length} employees removed from the group successfully`;
  }

  async verifyBankAccount(accountNumber, bankCode) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`, // Secure API Key
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              resolve(response.data); // Successfully verified
            } else {
              reject(
                new BadRequestException(
                  response.message || 'Account verification failed',
                ),
              );
            }
          } catch (error) {
            console.error('Error parsing JSON response:', error);
            reject(new Error('Invalid JSON response from Paystack'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });

      req.end();
    });
  }
}
