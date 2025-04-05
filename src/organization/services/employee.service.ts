import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, inArray, and } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import {
  employee_bank_details,
  employee_tax_details,
  employees,
} from '../../drizzle/schema/employee.schema';
import { companies } from '../../drizzle/schema/company.schema';
import {
  CreateEmployeeBankDetailsDto,
  CreateEmployeeDto,
  UpdateEmployeeBankDetailsDto,
  UpdateEmployeeDto,
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
import { PasswordResetToken } from 'src/drizzle/schema/password-reset-token.schema';
import { OnboardingService } from './onboarding.service';
import { payGroups } from 'src/drizzle/schema/payroll.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { salaryAdvance } from 'src/drizzle/schema/loans.schema';

Injectable();
export class EmployeeService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly aws: AwsService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
    private readonly onboardingService: OnboardingService,
    @InjectQueue('emailQueue') private emailQueue: Queue,
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
      const [companyResult, existingDepartment, existingGroups] =
        await Promise.all([
          trx
            .select()
            .from(companies)
            .where(eq(companies.id, company_id))
            .execute(),
          dto.department_name
            ? trx
                .select()
                .from(departments)
                .where(
                  and(
                    eq(departments.name, dto.department_name),
                    eq(departments.company_id, company_id), // Ensure department belongs to the company
                  ),
                )
                .execute()
            : null,
          dto.group_name
            ? trx
                .select()
                .from(payGroups)
                .where(
                  and(
                    eq(payGroups.name, dto.group_name),
                    eq(payGroups.company_id, company_id), // Ensure group belongs to the company
                  ),
                )
                .execute()
            : null,
        ]);

      if (companyResult.length === 0) {
        throw new BadRequestException('Company not found');
      }

      // Check if group exists
      let groupId: string | null = null;
      if (dto.group_name) {
        if (existingGroups && existingGroups.length > 0) {
          groupId = existingGroups[0].id;
        }
      }

      let departmentId: string | null = null;
      if (dto.department_name) {
        if (existingDepartment && existingDepartment.length > 0) {
          departmentId = existingDepartment[0].id;
        } else {
          // ✅ If department does not exist, create it
          const [newDepartment] = await trx
            .insert(departments)
            .values({
              name: dto.department_name,
              company_id: company_id,
            })
            .returning({ id: departments.id })
            .execute();

          departmentId = newDepartment.id;
        }
      }

      // Hash the generated password
      const randomPassword = randomBytes(12).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Check if email already exists
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

      // Create user
      const [user] = await trx
        .insert(users)
        .values({
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          first_name: dto.first_name,
          last_name: dto.last_name,
          company_id: company_id,
        })
        .returning({ id: users.id })
        .execute();

      // Insert employee with correct department ID
      const employee = await trx
        .insert(employees)
        .values({
          employee_number: dto.employee_number,
          first_name: dto.first_name,
          last_name: dto.last_name,
          job_title: dto.job_title,
          email: dto.email,
          phone: dto.phone,
          start_date: dto.start_date,
          company_id: company_id,
          department_id: departmentId,
          annual_gross: dto.annual_gross * 100,
          bonus: dto.bonus,
          commission: dto.commission,
          user_id: user.id,
          group_id: groupId,
          apply_nhf: dto.apply_nhf === 'Yes' ? true : false,
        })
        .returning({
          id: employees.id,
          employee_number: employees.employee_number,
          first_name: employees.first_name,
          email: employees.email,
        })
        .execute();

      // Generate password reset token
      const token = this.generateToken({ email: dto.email });
      const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);

      await trx
        .insert(PasswordResetToken)
        .values({
          user_id: user.id,
          token,
          expires_at,
          is_used: false,
        })
        .execute();

      await trx
        .insert(employee_bank_details)
        .values({
          employee_id: employee[0].id,
          bank_name: dto.bank_name,
          bank_account_number: dto.bank_account_number,
          bank_account_name: dto.first_name + ' ' + dto.last_name,
        })
        .execute();

      await trx
        .insert(employee_tax_details)
        .values({
          employee_id: employee[0].id,
          tin: dto.tin,
          pension_pin: dto.pension_pin,
          nhf_number: dto.nhf_number,
        })
        .execute();

      // Update onboarding progress
      await this.onboardingService.completeTask(company_id, 'addTeamMembers');

      // Send password reset email
      const inviteLink = `${this.config.get(
        'EMPLOYEE_PORTAL_URL',
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
      // ✅ Step 1: Fetch Company Once (No Need to Fetch in Loop)
      const companyExists = await trx
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, company_id))
        .execute();

      if (companyExists.length === 0) {
        throw new BadRequestException('Company not found');
      }

      // ✅ Step 2: Prepare Batch Fetch Queries
      const departmentNames = new Set(
        dtoArray
          .map((dto) => dto.department_name?.trim().toLowerCase())
          .filter(Boolean),
      );
      const groupNames = new Set(
        dtoArray
          .map((dto) => dto.group_name?.trim().toLowerCase())
          .filter(Boolean),
      );
      const emails = dtoArray.map((dto) => dto.email.toLowerCase());

      const [existingDepartments, existingGroups, existingUsers] =
        await Promise.all([
          departmentNames.size
            ? trx
                .select({ id: departments.id, name: departments.name })
                .from(departments)
                .where(
                  and(
                    inArray(departments.name, [...departmentNames]),
                    eq(departments.company_id, company_id),
                  ),
                )
                .execute()
            : Promise.resolve([]),
          groupNames.size
            ? trx
                .select({ id: payGroups.id, name: payGroups.name })
                .from(payGroups)
                .where(
                  and(
                    inArray(payGroups.name, [...groupNames]),
                    eq(payGroups.company_id, company_id),
                  ),
                )
                .execute()
            : Promise.resolve([]),
          trx
            .select()
            .from(users)
            .where(inArray(users.email, emails))
            .execute(),
        ]);

      // ✅ Step 3: Convert to Maps for Fast Lookups
      const departmentMap = new Map(
        existingDepartments.map((d) => [d.name.toLowerCase(), d.id]),
      );
      const groupMap = new Map(
        existingGroups.map((g) => [g.name.toLowerCase(), g.id]),
      );
      const existingEmails = new Set(existingUsers.map((u) => u.email));

      // ✅ Step 4: Batch Insert Missing Departments
      const newDepartments = [...departmentNames].filter(
        (name) => !departmentMap.has(name),
      );
      if (newDepartments.length) {
        const insertedDepartments = await trx
          .insert(departments)
          .values(newDepartments.map((name) => ({ name, company_id })))
          .returning({ id: departments.id, name: departments.name })
          .execute();
        insertedDepartments.forEach((d) =>
          departmentMap.set(d.name.toLowerCase(), d.id),
        );
      }

      // ✅ Step 5: Hash All Passwords in Parallel (CPU Intensive)
      const hashedPasswords = await Promise.all(
        dtoArray.map(() => bcrypt.hash(randomBytes(12).toString('hex'), 10)),
      );

      // ✅ Step 6: Prepare User Inserts
      const usersToInsert = dtoArray
        .filter((dto) => !existingEmails.has(dto.email.toLowerCase()))
        .map((dto, index) => ({
          email: dto.email.toLowerCase(),
          password: hashedPasswords[index],
          first_name: dto.first_name,
          last_name: dto.last_name,
          company_id,
        }));

      // ✅ Step 7: Insert Users in Bulk
      const insertedUsers = await trx
        .insert(users)
        .values(usersToInsert)
        .returning({ id: users.id, email: users.email })
        .execute();

      const userMap = new Map(
        insertedUsers.map((user) => [user.email, user.id]),
      );

      // ✅ Step 8: Prepare Employee Inserts
      const employeesToInsert = dtoArray.map((dto) => ({
        employee_number: dto.employee_number,
        first_name: dto.first_name,
        last_name: dto.last_name,
        job_title: dto.job_title,
        email: dto.email,
        phone: dto.phone,
        start_date: dto.start_date,
        company_id,
        department_id:
          departmentMap.get(dto.department_name?.trim().toLowerCase()) || null,
        annual_gross: dto.annual_gross * 100,
        bonus: dto.bonus,
        commission: dto.commission,
        user_id: userMap.get(dto.email.toLowerCase()),
        group_id: groupMap.get(dto.group_name?.trim().toLowerCase()) || null,
        apply_nhf: dto.apply_nhf === 'Yes',
      }));

      // ✅ Step 9: Bulk Insert Employees
      const insertedEmployees = await trx
        .insert(employees)
        .values(employeesToInsert)
        .returning({
          id: employees.id,
          email: employees.email,
          first_name: employees.first_name, // ✅ Add this
        })
        .execute();

      const employeeMap = new Map(
        insertedEmployees.map((e) => [e.email, e.id]),
      );

      // ✅ Step 10: Bulk Insert Bank & Tax Details
      await Promise.all([
        trx
          .insert(employee_bank_details)
          .values(
            dtoArray.map((dto) => ({
              employee_id: employeeMap.get(dto.email) || '',
              bank_name: dto.bank_name,
              bank_account_number: dto.bank_account_number,
              bank_account_name: `${dto.first_name} ${dto.last_name}`,
            })),
          )
          .execute(),
        trx
          .insert(employee_tax_details)
          .values(
            dtoArray.map((dto) => ({
              employee_id: employeeMap.get(dto.email) || '',
              tin: dto.tin,
              pension_pin: dto.pension_pin,
              nhf_number: dto.nhf_number,
            })),
          )
          .execute(),
      ]);

      // ✅ Step 11: Generate Password Reset Tokens
      const tokensToInsert = insertedEmployees.map((employee) => ({
        user_id: userMap.get(employee.email) || '',
        token: this.generateToken({ email: employee.email }),
        expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000),
        is_used: false,
      }));

      await trx.insert(PasswordResetToken).values(tokensToInsert).execute();

      const employeePortalUrl = this.config.get('EMPLOYEE_PORTAL_URL');

      await Promise.all(
        insertedEmployees.map((employee) => {
          const token = tokensToInsert.find(
            (t) => t.user_id === userMap.get(employee.email),
          )?.token;
          const inviteLink = `${employeePortalUrl}/auth/reset-password/${token}`;

          this.emailQueue.add('sendPasswordResetEmail', {
            email: employee.email,
            name: employee.first_name,
            resetLink: inviteLink,
          });
        }),
      );

      // ✅ Step 11: Update Onboarding Progress
      await this.onboardingService.completeTask(company_id, 'addTeamMembers');

      // ✅ Step 12: Return Results
      return insertedEmployees.map((employee) => ({
        email: employee.email,
        status: 'Success',
        company_id,
      }));
    });
  }

  async getEmployeeByUserId(user_id: string) {
    const result = await this.db
      .select({
        first_name: employees.first_name,
        last_name: employees.last_name,
        job_title: employees.job_title,
        phone: employees.phone,
        email: employees.email,
        employment_status: employees.employment_status,
        start_date: employees.start_date,
        employee_number: employees.employee_number,
        department_id: employees.department_id,
        annual_gross: employees.annual_gross,
        group_id: employees.group_id,
        employee_bank_details: employee_bank_details,
        employee_tax_details: employee_tax_details,
        companyId: companies.id,
        id: employees.id,
        company_name: companies.name,
        apply_nhf: employees.apply_nhf,
      })
      .from(employees)
      .innerJoin(companies, eq(companies.id, employees.company_id))
      .leftJoin(
        employee_bank_details,
        eq(employee_bank_details.employee_id, user_id),
      )
      .leftJoin(
        employee_tax_details,
        eq(employee_tax_details.employee_id, user_id),
      )
      .where(eq(employees.user_id, user_id))
      .execute();

    if (result.length === 0) {
      throw new BadRequestException(
        'Employee not found, please provide a valid email',
      );
    }

    return result[0];
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
      })
      .where(eq(employees.id, employee_id))
      .execute();

    return 'Employee updated successfully';
  }

  async deleteEmployee(employee_id: string) {
    const existingEmployee = await this.getEmployeeById(employee_id);

    // check if employee has active loan

    const hasActiveLoan = await this.db
      .select()
      .from(salaryAdvance)
      .where(and(eq(salaryAdvance.employee_id, employee_id)))
      .execute();

    if (hasActiveLoan.length > 0) {
      throw new BadRequestException(
        'Employee has an active loan. Please clear the loan before deleting the employee.',
      );
    }

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
