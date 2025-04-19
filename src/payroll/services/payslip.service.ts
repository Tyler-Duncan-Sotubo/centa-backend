import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq, and, asc, sql } from 'drizzle-orm';
import { payroll, payslips } from 'src/drizzle/schema/payroll.schema';
import {
  employee_bank_details,
  employees,
} from 'src/drizzle/schema/employee.schema';
import { json2csv } from 'json-2-csv';
import * as fs from 'fs';
import * as path from 'path';
import { CacheService } from 'src/config/cache/cache.service';
import { AwsService } from 'src/config/aws/aws.service';
import { companies } from 'src/drizzle/schema/company.schema';
import { PusherService } from 'src/notification/services/pusher.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PayslipService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private cache: CacheService,
    private aws: AwsService,
    private readonly pusher: PusherService,
    @InjectQueue('payrollQueue') private payrollQueue: Queue,
  ) {}
  // Employee Payslips
  async createPayslip(employee_id: string, payrollMonth: string) {
    // Check if payslip already exists for the month
    const existingPayslip = await this.db
      .select()
      .from(payslips)
      .where(
        and(
          eq(payslips.employee_id, employee_id),
          eq(payslips.payroll_month, payrollMonth),
        ),
      )
      .execute();

    if (existingPayslip.length) {
      throw new Error('Payslip already exists for this month');
    }

    // Get latest payroll record for the specified month
    const payrollRecord = await this.db
      .select()
      .from(payroll)
      .where(
        and(
          eq(payroll.employee_id, employee_id),
          eq(payslips.payroll_month, payrollMonth),
        ),
      )
      .limit(1)
      .execute();

    if (!payrollRecord.length) {
      throw new Error(
        'No payroll record found for this employee in the given month',
      );
    }

    // Insert new payslip
    const payslip = await this.db
      .insert(payslips)
      .values({
        payroll_id: payrollRecord[0].id,
        employee_id,
        company_id: payrollRecord[0].company_id,
        payroll_month: payrollMonth,
        issued_at: new Date().toISOString().split('T')[0],
        employer_remarks: 'Generated automatically',
        slip_status: 'issued',
      })
      .returning();

    return payslip;
  }

  private getCompany = async (company_id: string) => {
    const cacheKey = `company_id_${company_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const company = await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, company_id))
        .execute();

      if (!company) throw new BadRequestException('Company not found');

      return company[0].id;
    });
  };

  async generatePayslipsForCompany(company_id: string, payrollMonth: string) {
    // Get all payroll records for the company in the specified month
    const payrollRecords = await this.db
      .select()
      .from(payroll)
      .where(
        and(
          eq(payroll.company_id, company_id),
          eq(payroll.payroll_month, payrollMonth),
        ),
      )
      .execute();

    if (!payrollRecords.length) {
      throw new BadRequestException(
        'No payroll records found for this company in the given month',
      );
    }

    // Get all existing payslips for the month (to avoid duplicates)
    const existingPayslips = await this.db
      .select({ payrollId: payslips.payroll_id })
      .from(payslips)
      .where(
        and(
          eq(payslips.company_id, company_id),
          eq(payslips.payroll_month, payrollMonth),
        ),
      )
      .execute();

    const existingPayslipIds = new Set(
      existingPayslips.map((p) => p.payrollId),
    );

    // Prepare bulk insert data
    const newPayslips = payrollRecords
      .filter((record) => !existingPayslipIds.has(record.id)) // Avoid duplicates
      .map((record) => ({
        payroll_id: record.id,
        employee_id: record.employee_id,
        company_id: record.company_id,
        payroll_month: payrollMonth,
        issued_at: new Date().toISOString().split('T')[0],
        employer_remarks: 'Auto-generated',
        slip_status: 'issued',
      }));

    if (!newPayslips.length) {
      return { message: 'All payslips for this month already exist' };
    }

    // Insert all new payslips in one query (batch insert)
    await this.db.insert(payslips).values(newPayslips);

    // Broadcast to company channel
    await this.pusher.createNotification(
      newPayslips[0].company_id,
      `New payslips generated for ${payrollMonth}`,
      'payroll',
    );

    // Send notification to employees

    return { message: `${newPayslips.length} payslips generated successfully` };
  }

  async getCompanyPayslipsById(user_id: string, payroll_run_id: string) {
    const company_id = await this.getCompany(user_id);

    const companyPayslips = this.db
      .select({
        payslip_id: payslips.id,
        payroll_run_id: payroll.payroll_run_id,
        gross_salary: payroll.gross_salary,
        net_salary: payroll.net_salary,
        paye_tax: payroll.paye_tax,
        pension_contribution: payroll.pension_contribution,
        employer_pension_contribution: payroll.employer_pension_contribution,
        nhf_contribution: payroll.nhf_contribution,
        additionalDeductions: payroll.custom_deductions,
        payroll_month: payroll.payroll_month,
        first_name: employees.first_name,
        last_name: employees.last_name,
        status: payroll.approval_status,
        payment_status: payroll.payment_status,
        payment_date: payroll.payment_date,
        taxable_income: payroll.taxable_income,
        payslip_pdf_url: payslips.pdf_url,
        salaryAdvance: payroll.salary_advance,
      })
      .from(payslips)
      .where(
        and(
          eq(payroll.payroll_run_id, payroll_run_id),
          eq(employees.company_id, company_id),
        ),
      )
      .innerJoin(payroll, eq(payslips.payroll_id, payroll.id))
      .innerJoin(employees, eq(payroll.employee_id, employees.id))
      .execute();

    return companyPayslips;
  }

  // Download Payslips as CSV
  async DownloadCompanyPayslipsByMonth(
    user_id: string,
    payroll_run_id: string,
    format: 'internal' | 'bank' = 'internal', //
  ) {
    const company_id = await this.getCompany(user_id);
    // Get all payslips for the company in the specified month
    const companyPayslips = await this.db
      .select({
        employee_number: employees.employee_number,
        first_name: employees.first_name,
        last_name: employees.last_name,
        email: employees.email,
        issued_at: payslips.issued_at,
        employer_remarks: payslips.employer_remarks,

        // Convert kobo to naira by dividing by 100
        gross_salary: sql<number>`payroll.gross_salary / 100`,
        net_salary: sql<number>`payroll.net_salary / 100`,
        paye_tax: sql<number>`payroll.paye_tax / 100`,
        pension_contribution: sql<number>`payroll.pension_contribution / 100`,
        employer_pension_contribution: sql<number>`payroll.employer_pension_contribution / 100`,
        nhf_contribution: sql<number>`payroll.nhf_contribution / 100`,

        payroll_month: payroll.payroll_month,
        bank_name: employee_bank_details.bank_name,
        bank_account_number: employee_bank_details.bank_account_number,
        payroll_id: payroll.id,
      })
      .from(payslips)
      .innerJoin(payroll, eq(payslips.payroll_id, payroll.id))
      .innerJoin(employees, eq(payroll.employee_id, employees.id))
      .leftJoin(
        employee_bank_details,
        eq(employees.id, employee_bank_details.employee_id),
      )
      .where(
        and(
          eq(payroll.payroll_run_id, payroll_run_id),
          eq(employees.company_id, company_id),
        ),
      )
      .orderBy(asc(employees.employee_number))
      .execute();

    if (!companyPayslips || companyPayslips.length === 0) {
      return null;
    }

    // Select fields based on format
    const csvFields =
      format === 'bank'
        ? [
            { field: 'employee_number', title: 'Employee Number' },
            { field: 'first_name', title: 'First Name' },
            { field: 'last_name', title: 'Last Name' },
            { field: 'bank_name', title: 'Bank Name' },
            { field: 'bank_account_number', title: 'Bank Account Number' },
            { field: 'net_salary', title: 'Net Salary' },
          ]
        : [
            { field: 'employee_number', title: 'Employee Number' },
            { field: 'first_name', title: 'First Name' },
            { field: 'last_name', title: 'Last Name' },
            { field: 'email', title: 'Email' },
            { field: 'gross_salary', title: 'Gross Salary' },
            { field: 'net_salary', title: 'Net Salary' },
            { field: 'paye_tax', title: 'PAYE Tax' },
            { field: 'pension_contribution', title: 'Pension Contribution' },
            {
              field: 'employer_pension_contribution',
              title: 'Employer Pension Contribution',
            },
            { field: 'nhf_contribution', title: 'NHF Contribution' },
            { field: 'payroll_month', title: 'Payroll Month' },
            { field: 'issued_at', title: 'Issued Date' },
            { field: 'employer_remarks', title: 'Employer Remarks' },
          ];

    const csvData = json2csv(companyPayslips, {
      prependHeader: true, // Ensures headers are included
      emptyFieldValue: '', // Fills empty fields with blank instead of null
      keys: csvFields.map((field) => {
        return { field: field.field, title: field.title };
      }),
    });

    // Construct the file path
    const filePath = path.resolve(
      process.cwd(),
      'src/downloads',
      `payslips-${payroll_run_id}.csv`,
    );

    // Ensure the storage directory exists
    const storageDir = path.dirname(filePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    // Write CSV to file
    fs.writeFileSync(filePath, csvData, 'utf8');

    // Upload to S3
    await this.aws.uploadFile(
      filePath,
      `payslips-${payroll_run_id}-${format}.csv`,
      company_id,
      'payroll',
      'download',
    );

    return filePath;
  }

  async getEmployeePayslipSummary(employee_id: string) {
    const paystubs = await this.db
      .select({
        payslip_id: payslips.id,
        payroll_date: payroll.payroll_month,
        gross_salary: payroll.gross_salary,
        net_salary: payroll.net_salary,
        totalDeduction: payroll.total_deductions,
        taxableIncome: payroll.taxable_income,
        paye: payroll.paye_tax,
        pensionContribution: payroll.pension_contribution,
        nhfContribution: payroll.nhf_contribution,
        salaryAdvance: payroll.salary_advance,
        payslip_pdf_url: payslips.pdf_url,
        paymentStatus: payroll.payment_status,
      })
      .from(payslips)
      .innerJoin(payroll, eq(payslips.payroll_id, payroll.id))
      .where(eq(payslips.employee_id, employee_id))
      .orderBy(asc(payslips.issued_at))
      .limit(4)
      .execute();

    return paystubs;
  }

  async getEmployeePayslip(payslip_id: string) {
    const result = await this.db
      .select({
        id: payslips.id,
        issued_at: payslips.issued_at,
        status: payslips.slip_status,
        employer_remarks: payslips.employer_remarks,
        gross_salary: payroll.gross_salary,
        net_salary: payroll.net_salary,
        paye_tax: payroll.paye_tax,
        pdf_url: payslips.pdf_url,
        salaryAdvance: payroll.salary_advance,
        pension_contribution: payroll.pension_contribution,
        nhf_contribution: payroll.nhf_contribution,
        payroll_month: payroll.payroll_month,
        first_name: employees.first_name,
        last_name: employees.last_name,
        email: employees.email,
        company_name: companies.name,
        company_address: companies.address,
        company_email: companies.email,
        company_logo: companies.logo_url,
        company_city: companies.city,
      })
      .from(payslips)
      .innerJoin(payroll, eq(payslips.payroll_id, payroll.id))
      .innerJoin(employees, eq(payroll.employee_id, employees.id))
      .innerJoin(companies, eq(employees.company_id, companies.id))
      .where(eq(payslips.id, payslip_id))
      .execute();

    return result[0]; // Return a single payslip record
  }
}
