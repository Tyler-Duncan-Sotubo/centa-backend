import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { employees } from 'src/drizzle/schema/employee.schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  customDeductions,
  taxConfig,
} from 'src/drizzle/schema/deductions.schema';
import {
  bonus,
  payroll,
  payslips,
  salaryBreakdown,
} from 'src/drizzle/schema/payroll.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createBonusDto } from '../dto';
import { companies } from 'src/drizzle/schema/company.schema';
import { CacheService } from 'src/config/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';
import { LoanService } from './loan.service';

@Injectable()
export class PayrollService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    @InjectQueue('payrollQueue') private payrollQueue: Queue,
    private cache: CacheService,
    private loanService: LoanService,
  ) {}

  private formattedDate = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const formattedDate = `${year}-${month}`;
    return formattedDate;
  };

  private calculatePAYE(
    annualSalary: number,
    applyPension: boolean | null,
    applyNHF: boolean | null,
  ): { paye: number; taxableIncome: number } {
    let paye = 0;

    // 1️⃣ Compute Personal Allowance
    const personalAllowance = 200000 + 0.2 * annualSalary;

    // 2️⃣ Initial taxable income before deductions
    let taxableIncome = Math.max(annualSalary - personalAllowance, 0);

    // 3️⃣ Apply Pension (8%) if enabled
    const pensionDeduction = applyPension ? 0.08 * annualSalary : 0;
    taxableIncome -= pensionDeduction;

    // 4️⃣ Apply NHF (2.5%) if enabled
    const nhfDeduction = applyNHF ? 0.025 * annualSalary : 0;
    taxableIncome -= nhfDeduction;

    // Ensure taxable income never goes below zero
    taxableIncome = Math.max(taxableIncome, 0);

    // 5️⃣ PAYE Tax Brackets (Nigerian system)
    const brackets = [
      { limit: 300000, rate: 0.07 }, // 7%
      { limit: 300000, rate: 0.11 }, // 11%
      { limit: 500000, rate: 0.15 }, // 15%
      { limit: 500000, rate: 0.19 }, // 19%
      { limit: 1600000, rate: 0.21 }, // 21%
      { limit: Infinity, rate: 0.24 }, // 24% for income above ₦3.2M
    ];

    // 6️⃣ Apply PAYE Tax Brackets
    let remainingIncome = taxableIncome;
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;

      const taxableAmount = Math.min(bracket.limit, remainingIncome);
      paye += taxableAmount * bracket.rate;
      remainingIncome -= taxableAmount;
    }

    return {
      paye: Math.floor(paye), // PAYE Tax
      taxableIncome: Math.floor(taxableIncome), // Final taxable income after deductions
    };
  }

  async calculatePayroll(
    employee_id: string,
    payrollMonth: string,
    payrollRunId: string,
    company_id: string,
  ) {
    const employee = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    if (!employee.length) throw new BadRequestException('Employee not found');

    // Fetch required data in parallel
    const [customDeduction, bonuses, unpaidAdvance, tax] = await Promise.all([
      this.db
        .select()
        .from(customDeductions)
        .where(eq(customDeductions.employee_id, employee[0].id))
        .execute(),
      this.db
        .select()
        .from(bonus)
        .where(
          and(
            eq(bonus.employee_id, employee_id),
            eq(bonus.payroll_month, payrollMonth),
          ),
        )
        .execute(),
      this.loanService.getUnpaidAdvanceDeductions(employee_id),
      this.db
        .select({
          apply_pension: taxConfig.apply_pension,
          apply_paye: taxConfig.apply_paye,
          apply_nhf: taxConfig.apply_nhf,
        })
        .from(taxConfig)
        .where(eq(taxConfig.company_id, company_id))
        .execute(),
    ]);

    const unpaidAdvanceAmount = Math.floor(
      unpaidAdvance?.[0]?.monthlyDeduction || 0,
    );

    // Prepare Payroll Calculation
    const grossSalary =
      Math.floor(Number(employee[0].annual_gross) / 12) -
      Math.floor(unpaidAdvanceAmount);

    const annualGross = Number(employee[0].annual_gross);

    const applyPension = tax[0].apply_pension;
    const applyNHF = tax[0].apply_nhf;

    // Calculate PAYE & taxable income
    const { paye, taxableIncome } = this.calculatePAYE(
      annualGross,
      applyPension,
      applyNHF,
    );

    // Compute monthly PAYE
    const monthlyPAYE = Math.floor(paye / 12);

    // Compute Employee Pension Contribution (8%)
    const employeePensionContribution = applyPension
      ? Math.floor((grossSalary * 8) / 100)
      : 0;

    // Compute Employer Pension Contribution (10%)
    const employerPensionContribution = applyPension
      ? Math.floor((grossSalary * 10) / 100)
      : 0;

    // Compute NHF Contribution (2.5%)
    const nhfContribution = applyNHF
      ? Math.floor((grossSalary * 2.5) / 100)
      : 0;

    // Sum custom deductions
    const totalCustomDeductions = Math.floor(
      (customDeduction || []).reduce(
        (sum, deduction) => sum + (deduction.amount || 0),
        0,
      ),
    );

    // Sum total bonuses
    const totalBonuses = Math.floor(
      (bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount), 0),
    );

    // Compute Total Deductions
    const totalDeductions = Math.floor(
      monthlyPAYE +
        employeePensionContribution +
        nhfContribution +
        totalCustomDeductions,
    );

    // Compute Net Salary (Ensure it doesn't go negative)
    const netSalary = Math.max(
      0,
      Math.floor(grossSalary + totalBonuses - totalDeductions),
    );

    // Save Payroll Calculation
    const savedPayroll = await this.db
      .insert(payroll)
      .values({
        employee_id: employee_id,
        company_id: employee[0].company_id,
        gross_salary: grossSalary,
        bonuses: totalBonuses,
        paye_tax: monthlyPAYE,
        pension_contribution: employeePensionContribution,
        employer_pension_contribution: employerPensionContribution,
        nhf_contribution: nhfContribution,
        custom_deductions: totalCustomDeductions,
        net_salary: netSalary,
        payroll_date: new Date().toISOString().split('T')[0],
        payroll_month: payrollMonth,
        total_deductions: totalDeductions,
        payroll_run_id: payrollRunId,
        taxable_income: taxableIncome,
        salary_advance: unpaidAdvanceAmount,
      })
      .returning()
      .execute();

    return savedPayroll;
  }

  async calculatePayrollForCompany(company_id: string, payrollMonth: string) {
    const companyId = await this.getCompany(company_id);

    const existingEmployees = await this.db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(
        and(
          eq(employees.company_id, companyId),
          eq(employees.employment_status, 'active'),
        ),
      )
      .execute();

    if (existingEmployees.length === 0)
      throw new BadRequestException('No employees found for this company');

    const payrollRunId = uuidv4();

    const payrollResults = await Promise.all(
      existingEmployees.map((employee) =>
        this.calculatePayroll(
          employee.id,
          payrollMonth,
          payrollRunId,
          company_id,
        ),
      ),
    );

    // clear cache
    await this.cache.del(`payroll_summary_${companyId}`);
    await this.cache.del(`payroll_status_${companyId}`);

    await this.payrollQueue.add('generatePayslips', {
      company_id,
      payrollMonth,
    });

    return payrollResults;
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

  // get payroll Summary
  async getPayrollSummary(companyId: string) {
    const cacheKey = `payroll_summary_${companyId}`;
    const company_id = await this.getCompany(companyId);

    return this.cache.getOrSetCache(cacheKey, async () => {
      return await this.db
        .select({
          payroll_run_id: payroll.payroll_run_id,
          payroll_date: payroll.payroll_date,
          payroll_month: payroll.payroll_month,
          approval_status: payroll.approval_status,
          payment_status: payroll.payment_status,
          total_gross_salary: sql<number>`SUM(${payroll.gross_salary})`.as(
            'total_gross_salary',
          ),
          employee_count:
            sql<number>`COUNT(DISTINCT ${payroll.employee_id})`.as(
              'employee_count',
            ),
          total_deductions:
            sql<number>`SUM(${payroll.paye_tax} + ${payroll.pension_contribution} + ${payroll.nhf_contribution})`.as(
              'total_deductions',
            ),
          total_net_salary: sql<number>`SUM(${payroll.net_salary})`.as(
            'total_net_salary',
          ),
        })
        .from(payroll)
        .where(eq(payroll.company_id, company_id))
        .groupBy(
          payroll.payroll_run_id,
          payroll.payroll_date,
          payroll.payroll_month,
          payroll.approval_status,
          payroll.payment_status,
        )
        .execute();
    });
  }

  // get payroll status for notification
  async getPayrollStatus(companyId: string) {
    const company_id = await this.getCompany(companyId);

    const cacheKey = `payroll_status_${companyId}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      return await this.db
        .select({
          payroll_run_id: payroll.payroll_run_id,
        })
        .from(payroll)
        .where(
          and(
            eq(payroll.company_id, company_id),
            eq(payroll.approval_status, 'pending'),
          ),
        )

        .execute();
    });
  }

  // Update Payroll Approval Status
  async updatePayrollApprovalStatus(
    user_id: string,
    payroll_run_id: string,
    approval_status: string,
  ) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .update(payroll)
      .set({ approval_status })
      .where(
        and(
          eq(payroll.company_id, company_id),
          eq(payroll.payroll_run_id, payroll_run_id),
        ),
      )
      .returning()
      .execute();

    // clear cache
    await this.cache.del(`payroll_summary_${user_id}`);
    await this.cache.del(`payroll_status_${user_id}`);

    return result;
  }

  // Update Payroll Approval Status
  async updatePayrollPaymentStatus(
    user_id: string,
    payroll_run_id: string,
    payment_status: string,
  ) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .update(payroll)
      .set({
        payment_status,
        payment_date: new Date().toISOString().split('T')[0],
      })
      .where(
        and(
          eq(payroll.company_id, company_id),
          eq(payroll.payroll_run_id, payroll_run_id),
        ),
      )
      .returning({
        payroll_month: payroll.payroll_month,
      })
      .execute();

    // clear cache
    await this.cache.del(`payroll_summary_${user_id}`);
    await this.cache.del(`payroll_status_${user_id}`);

    await this.payrollQueue.add('populateTaxDetails', {
      company_id,
      payrollMonth: result[0].payroll_month,
    });

    const getPayslips = await this.db
      .select()
      .from(payslips)
      .where(eq(payslips.payroll_month, result[0].payroll_month))
      .execute();

    for (const payslip of getPayslips) {
      await this.payrollQueue.add('generatePayslipPdf', {
        payslipId: payslip.id,
      });
    }

    return result;
  }

  //delete payroll

  async deletePayroll(company_id: string, payroll_run_id: string) {
    const companyId = await this.getCompany(company_id);

    const result = await this.db
      .delete(payroll)
      .where(
        and(
          eq(payroll.company_id, companyId),
          eq(payroll.payroll_run_id, payroll_run_id),
        ),
      )
      .execute();

    // clear cache
    await this.cache.del(`payroll_summary_${company_id}`);
    await this.cache.del(`payroll_status_${company_id}`);

    return result;
  }

  // Salary Breakdown
  async getSalaryBreakdown(user_id: string) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .select({
        id: salaryBreakdown.id,
        basic: salaryBreakdown.basic,
        housing: salaryBreakdown.housing,
        transport: salaryBreakdown.transport,
        others: salaryBreakdown.others,
      })
      .from(salaryBreakdown)
      .where(eq(salaryBreakdown.company_id, company_id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0];
  }

  async createSalaryBreakdown(user_id: string, dto: any) {
    const company_id = await this.getCompany(user_id);

    const existingBreakdown = await this.db
      .select()
      .from(salaryBreakdown)
      .where(eq(salaryBreakdown.company_id, company_id))
      .execute();

    if (existingBreakdown.length > 0) {
      const result = await this.db
        .update(salaryBreakdown)
        .set(dto)
        .where(eq(salaryBreakdown.company_id, company_id))
        .returning()
        .execute();

      return result;
    } else {
      const result = await this.db
        .insert(salaryBreakdown)
        .values({
          company_id,
          ...dto,
        })
        .returning()
        .execute();

      return result;
    }
  }

  // delete salary breakdown
  async deleteSalaryBreakdown(user_id: string) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .delete(salaryBreakdown)
      .where(eq(salaryBreakdown.company_id, company_id))
      .execute();

    return result;
  }

  // Bonus
  async createBonus(user_id: string, dto: createBonusDto) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .insert(bonus)
      .values({
        company_id,
        payroll_month: this.formattedDate(),
        ...dto,
      })
      .returning()
      .execute();

    return result;
  }

  async getBonuses(user_id: string) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .select({
        id: bonus.id,
        employee_id: bonus.employee_id,
        amount: bonus.amount,
        bonus_type: bonus.bonus_type,
        first_name: employees.first_name,
        last_name: employees.last_name,
        payroll_month: bonus.payroll_month,
      })
      .from(bonus)
      .where(eq(bonus.company_id, company_id))
      .leftJoin(employees, eq(bonus.employee_id, employees.id))
      .execute();

    return result;
  }

  async deleteBonus(user_id: string, id: string) {
    const company_id = await this.getCompany(user_id);

    const result = await this.db
      .delete(bonus)
      .where(and(eq(bonus.company_id, company_id), eq(bonus.id, id)))
      .execute();

    return result;
  }
}
