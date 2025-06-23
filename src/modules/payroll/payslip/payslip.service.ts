import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, asc, sql, like } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { CacheService } from 'src/common/cache/cache.service';
import { AwsService } from 'src/common/aws/aws.service';
import { paySlips } from '../schema/payslip.schema';
import { payroll } from '../schema/payroll-run.schema';
import { companies, employees } from 'src/drizzle/schema';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import { payrollYtd } from '../schema/payroll-ytd.schema';

@Injectable()
export class PayslipService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private cache: CacheService,
    private aws: AwsService,
    @InjectQueue('payrollQueue') private payrollQueue: Queue,
    private pusher: PusherService,
  ) {}
  // Employee Payslips
  async createPayslip(employee_id: string, payrollMonth: string) {
    // Check if payslip already exists for the month
    const existingPayslip = await this.db
      .select()
      .from(paySlips)
      .where(
        and(
          eq(paySlips.employeeId, employee_id),
          eq(paySlips.payrollMonth, payrollMonth),
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
          eq(payroll.employeeId, employee_id),
          eq(paySlips.payrollMonth, payrollMonth),
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
      .insert(paySlips)
      .values({
        payrollId: payrollRecord[0].id,
        employeeId: employee_id,
        companyId: payrollRecord[0].companyId,
        payrollMonth: payrollMonth,
        issuedAt: new Date().toISOString().split('T')[0],
        employerRemarks: 'Generated automatically',
        slipStatus: 'issued',
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
          eq(payroll.companyId, company_id),
          eq(payroll.payrollMonth, payrollMonth),
        ),
      )
      .execute();

    if (!payrollRecords.length) {
      throw new BadRequestException(
        'No payroll records found for this company in the given month',
      );
    }

    // Prepare bulk insert data
    const newPayslips = payrollRecords.map((record) => ({
      payrollId: record.id,
      employeeId: record.employeeId,
      companyId: record.companyId,
      payrollMonth: payrollMonth,
      issuedAt: new Date().toISOString().split('T')[0],
      employerRemarks: 'Auto-generated',
      slipStatus: 'issued',
    }));

    if (!newPayslips.length) {
      return { message: 'All payslips for this month already exist' };
    }

    // Insert all new payslips in one query (batch insert)
    const payslips = await this.db.insert(paySlips).values(newPayslips);

    return payslips;
  }

  async getCompanyPayslipsById(user_id: string, payroll_run_id: string) {
    const company_id = await this.getCompany(user_id);

    const companyPayslips = this.db
      .select({
        payslip_id: paySlips.id,
        payroll_run_id: payroll.payrollRunId,
        gross_salary: payroll.grossSalary,
        net_salary: payroll.netSalary,
        paye_tax: payroll.payeTax,
        pension_contribution: payroll.pensionContribution,
        employer_pension_contribution: payroll.employerPensionContribution,
        nhf_contribution: payroll.nhfContribution,
        additionalDeductions: payroll.customDeductions,
        payroll_month: payroll.payrollMonth,
        first_name: employees.firstName,
        last_name: employees.lastName,
        status: payroll.approvalStatus,
        payment_status: payroll.paymentStatus,
        payment_date: payroll.paymentDate,
        taxable_income: payroll.taxableIncome,
        payslip_pdf_url: paySlips.pdfUrl,
        salaryAdvance: payroll.salaryAdvance,
      })
      .from(paySlips)
      .where(
        and(
          eq(payroll.payrollRunId, payroll_run_id),
          eq(employees.companyId, company_id),
        ),
      )
      .innerJoin(payroll, eq(paySlips.payrollId, payroll.id))
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .execute();

    return companyPayslips;
  }

  async getEmployeePayslipSummary(employee_id: string) {
    const paystubs = await this.db
      .select({
        payslip_id: paySlips.id,
        payroll_date: payroll.payrollMonth,
        gross_salary: payroll.grossSalary,
        net_salary: payroll.netSalary,
        totalDeduction: payroll.totalDeductions,
        taxableIncome: payroll.taxableIncome,
        paye: payroll.payeTax,
        pensionContribution: payroll.pensionContribution,
        nhfContribution: payroll.nhfContribution,
        salaryAdvance: payroll.salaryAdvance,
        payslip_pdf_url: paySlips.pdfUrl,
        paymentStatus: payroll.paymentStatus,
        basic: payroll.basic,
        housing: payroll.housing,
        transport: payroll.transport,
        voluntaryDeductions: payroll.voluntaryDeductions,
      })
      .from(paySlips)
      .innerJoin(payroll, eq(paySlips.payrollId, payroll.id))
      .where(eq(paySlips.employeeId, employee_id))
      .orderBy(asc(paySlips.issuedAt))
      .limit(4)
      .execute();

    return paystubs;
  }

  async getEmployeePayslip(payslip_id: string) {
    const currentYear = new Date().getFullYear();

    const result = await this.db
      .select({
        id: paySlips.id,
        issued_at: paySlips.issuedAt,
        status: paySlips.slipStatus,
        employer_remarks: paySlips.employerRemarks,
        gross_salary: payroll.grossSalary,
        net_salary: payroll.netSalary,
        basic: payroll.basic,
        housing: payroll.housing,
        transport: payroll.transport,
        paye_tax: payroll.payeTax,
        pdf_url: paySlips.pdfUrl,
        salaryAdvance: payroll.salaryAdvance,
        pension_contribution: payroll.pensionContribution,
        nhf_contribution: payroll.nhfContribution,
        payroll_month: payroll.payrollMonth,
        first_name: employees.firstName,
        last_name: employees.lastName,
        email: employees.email,
        employeeId: employees.id,
        company_name: companies.name,
        companyLogo: companies.logo_url,
        company_email: companies.primaryContactEmail,
        payment_date: payroll.paymentDate,
        reimbursement: payroll.reimbursements,
      })
      .from(paySlips)
      .innerJoin(payroll, eq(paySlips.payrollId, payroll.id))
      .innerJoin(payrollYtd, eq(paySlips.payrollId, payrollYtd.payrollId))
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .innerJoin(companies, eq(employees.companyId, companies.id))
      .where(eq(paySlips.id, payslip_id))
      .execute();

    const ytdTotals = await this.db
      .select({
        ytdPension: sql<number>`SUM(${payrollYtd.pension})`.as('ytdPension'),
        ytdNhf: sql<number>`SUM(${payrollYtd.nhf})`.as('ytdNhf'),
        ytdPaye: sql<number>`SUM(${payrollYtd.PAYE})`.as('ytdPaye'),
        ytdGross: sql<number>`SUM(${payrollYtd.grossSalary})`.as('ytdGross'),
        ytdNet: sql<number>`SUM(${payrollYtd.netSalary})`.as('ytdNet'),
        ytdBasic: sql<number>`SUM(${payrollYtd.basic})`.as('ytdBasic'),
        ytdHousing: sql<number>`SUM(${payrollYtd.housing})`.as('ytdHousing'),
        ytdTransport: sql<number>`SUM(${payrollYtd.transport})`.as(
          'ytdTransport',
        ),
      })
      .from(payrollYtd)
      .innerJoin(payroll, eq(payrollYtd.payrollId, payroll.id))
      .where(
        and(
          eq(payrollYtd.employeeId, result[0].employeeId),
          like(payroll.payrollMonth, `${currentYear}-%`), // only for this year
        ),
      )
      .execute();

    return {
      ...result[0],
      ...ytdTotals[0],
    };
  }
}
