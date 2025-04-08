import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { employees } from 'src/drizzle/schema/employee.schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  customDeductions,
  taxConfig,
} from 'src/drizzle/schema/deductions.schema';
import {
  bonus,
  companyAllowances,
  payGroups,
  payroll,
  payrollAllowances,
  payslips,
  salaryBreakdown,
  ytdPayroll,
} from 'src/drizzle/schema/payroll.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createBonusDto } from '../dto';
import { companies } from 'src/drizzle/schema/company.schema';
import { CacheService } from 'src/config/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';
import { LoanService } from './loan.service';
import { TaxService } from './tax.service';

@Injectable()
export class PayrollService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    @InjectQueue('payrollQueue') private payrollQueue: Queue,
    private cache: CacheService,
    private loanService: LoanService,
    private taxService: TaxService,
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
    pensionDeduction: number,
    nhfDeduction: number,
  ): { paye: number; taxableIncome: number } {
    let paye = 0;

    const redefinedAnnualSalary =
      annualSalary - pensionDeduction * 12 - nhfDeduction * 12;

    // Compute Personal Allowance correctly in kobo
    const personalAllowance = 200000 * 100 + 0.2 * redefinedAnnualSalary;

    // Compute Taxable Income (Ensuring it's non-negative)
    const taxableIncome = Math.max(
      annualSalary -
        personalAllowance -
        pensionDeduction * 12 -
        nhfDeduction * 12,
      0,
    );

    // PAYE Tax Brackets (Nigerian System in Kobo)
    const brackets = [
      { limit: 300000 * 100, rate: 0.07 }, // First ₦300,000
      { limit: 600000 * 100, rate: 0.11 }, // Next ₦300,000
      { limit: 1100000 * 100, rate: 0.15 }, // Next ₦500,000
      { limit: 1600000 * 100, rate: 0.19 }, // Next ₦500,000
      { limit: 3200000 * 100, rate: 0.21 }, // Next ₦1,600,000
      { limit: Infinity, rate: 0.24 }, // Above ₦3,200,000
    ];

    // 6️⃣ Apply PAYE Tax Brackets
    let remainingIncome = taxableIncome;
    let previousLimit = 0;
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;

      // Tax only the portion within the bracket range
      const taxableAmount = Math.min(
        remainingIncome,
        bracket.limit - previousLimit,
      );
      paye += taxableAmount * bracket.rate;
      remainingIncome -= taxableAmount;
      previousLimit = bracket.limit;
    }

    return {
      paye: Math.floor(paye), // PAYE Tax
      taxableIncome: Math.floor(taxableIncome), // Taxable Income
    };
  }

  async calculatePayroll(
    employee_id: string,
    payrollMonth: string,
    payrollRunId: string,
    company_id: string,
  ) {
    // Fetch employee data
    const employee = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    if (!employee.length) throw new BadRequestException('Employee not found');

    // Fetch required data in parallel
    const [
      customDeduction,
      bonuses,
      unpaidAdvance,
      companyTaxConfig,
      salary,
      allowances,
    ] = await Promise.all([
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
        .select()
        .from(taxConfig)
        .where(eq(taxConfig.company_id, company_id))
        .execute(),
      this.db
        .select()
        .from(salaryBreakdown)
        .where(eq(salaryBreakdown.company_id, company_id))
        .execute(),
      this.db
        .select()
        .from(companyAllowances)
        .where(eq(companyAllowances.company_id, company_id))
        .execute(),
    ]);

    // Validate Salary Structure
    if (!salary.length)
      throw new BadRequestException('Salary structure not found');

    // Compute Base Monthly Salary & Unpaid Advance Deduction
    const unpaidAdvanceAmount = unpaidAdvance?.[0]?.monthlyDeduction || 0;
    const grossSalaryBeforeDeductions = Number(employee[0].annual_gross) / 12;
    const grossSalary = grossSalaryBeforeDeductions;

    // Compute BHT
    const basic = (Number(salary[0].basic) / 100) * grossSalary;
    const housing = (Number(salary[0].housing) / 100) * grossSalary;
    const transport = (Number(salary[0].transport) / 100) * grossSalary;
    const BHT = basic + housing + transport;

    // Compute Allowances

    const payrollAllowancesData = allowances.map((allowance) => {
      const amount = Math.floor(
        (Number(allowance.allowance_percentage) / 100) * grossSalary,
      );

      return {
        allowance_type: allowance.allowance_type,
        allowance_amount: amount,
      };
    });

    // Compute Final Gross Salary

    // Check if pension and NHF should be applied
    let applyPension = false;
    let applyNHF = false;

    // Fetch employee's pay group (which includes tax settings)
    const payGroup = await this.db
      .select()
      .from(payGroups)
      .where(eq(payGroups.id, employee[0].group_id!))
      .execute();

    // Handle missing pay group
    if (!payGroup.length) {
      applyPension = companyTaxConfig[0]?.apply_pension || false;
      applyNHF = companyTaxConfig[0]?.apply_nhf || false;
    } else {
      // Use pay group settings
      applyPension = payGroup[0]?.apply_pension || false;
      applyNHF = payGroup[0]?.apply_nhf || false;
    }

    // Compute Pension Contributions (Based on BHT)
    const employeePensionContribution = applyPension ? (BHT * 8) / 100 : 0;
    const employerPensionContribution = applyPension ? (BHT * 10) / 100 : 0;

    // Compute NHF Contribution
    const nhfContribution =
      applyNHF && employee[0].apply_nhf ? (basic * 2.5) / 100 : 0;

    // Compute PAYE Tax
    const { paye, taxableIncome } = this.calculatePAYE(
      Number(employee[0].annual_gross),
      employeePensionContribution,
      nhfContribution,
    );

    const monthlyPAYE = paye / 12;

    // Compute Total Deductions
    const totalCustomDeductions = (customDeduction || []).reduce(
      (sum, deduction) => sum + (deduction.amount || 0),
      0,
    );

    // Compute Total Bonuses
    const totalBonuses = (bonuses || []).reduce(
      (sum, bonus) => sum + Number(bonus.amount),
      0,
    );

    const totalDeductions =
      monthlyPAYE +
      employeePensionContribution +
      nhfContribution +
      totalCustomDeductions;

    // Compute Net Salary (Ensure it doesn't go negative)
    const netSalary = Math.max(
      0,
      grossSalary + totalBonuses - totalDeductions - unpaidAdvanceAmount,
    );

    // Save Payroll Calculation
    const savedPayroll = await this.db
      .insert(payroll)
      .values({
        payroll_run_id: payrollRunId,
        employee_id: employee_id,
        company_id: company_id,
        basic: Math.floor(basic),
        housing: Math.floor(housing),
        transport: Math.floor(transport),
        gross_salary: Math.floor(grossSalary),
        pension_contribution: Math.floor(employeePensionContribution),
        employer_pension_contribution: Math.floor(employerPensionContribution),
        bonuses: Math.floor(totalBonuses),
        nhf_contribution: Math.floor(nhfContribution),
        paye_tax: Math.floor(monthlyPAYE),
        salary_advance: unpaidAdvanceAmount,
        custom_deductions: Math.floor(totalCustomDeductions),
        total_deductions: Math.floor(totalDeductions),
        taxable_income: Math.floor(taxableIncome),
        net_salary: Math.floor(netSalary),
        payroll_date: new Date().toISOString().split('T')[0],
        payroll_month: payrollMonth,
      })
      .returning()
      .execute();

    // Save YTD Payroll
    await this.db
      .insert(ytdPayroll)
      .values({
        employee_id: employee_id,
        payroll_month: payrollMonth,
        payroll_id: savedPayroll[0].id,
        company_id: company_id,
        year: new Date().getFullYear(),
        gross_salary: Math.floor(grossSalary),
        net_salary: Math.floor(netSalary),
        total_deductions: Math.floor(totalDeductions),
        bonuses: Math.floor(totalBonuses),
      })
      .execute();

    // Save Allowances
    if (payrollAllowancesData.length > 0) {
      await this.db
        .insert(payrollAllowances)
        .values(
          payrollAllowancesData.map((allowance) => ({
            payroll_id: savedPayroll[0].id,
            ...allowance,
          })),
        )
        .execute();
    }

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
            sql<number>`SUM(${payroll.paye_tax} + ${payroll.pension_contribution} + ${payroll.nhf_contribution} + + ${payroll.employer_pension_contribution})`.as(
              'total_deductions',
            ),
          total_net_salary: sql<number>`SUM(${payroll.net_salary})`.as(
            'total_net_salary',
          ),
          totalPayrollCost:
            sql<number>`SUM(${payroll.gross_salary}+ ${payroll.pension_contribution} + ${payroll.nhf_contribution} + + ${payroll.employer_pension_contribution})`.as(
              'totalPayrollCost',
            ),
        })
        .from(payroll)
        .where(eq(payroll.company_id, company_id))
        .orderBy(desc(payroll.payroll_date))
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

    await this.taxService.onPayrollApproval(
      company_id,
      result[0].payroll_month,
      payroll_run_id,
    );

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
        allowance_percentage: companyAllowances.allowance_percentage,
        allowance_type: companyAllowances.allowance_type,
        allowance_id: companyAllowances.id,
      })
      .from(salaryBreakdown)
      .leftJoin(
        companyAllowances,
        eq(salaryBreakdown.company_id, companyAllowances.company_id),
      )
      .where(eq(salaryBreakdown.company_id, company_id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Group allowances into an array
    const formattedResult = {
      id: result[0].id,
      basic: result[0].basic,
      housing: result[0].housing,
      transport: result[0].transport,
      allowances: result
        .filter((row) => row.allowance_type) // Exclude null allowances
        .map((row) => ({
          type: row.allowance_type,
          percentage: row.allowance_percentage,
          id: row.allowance_id,
        })),
    };

    return formattedResult;
  }

  async createUpdateSalaryBreakdown(user_id: string, dto: any) {
    const company_id = await this.getCompany(user_id);

    // Extract allowances separately
    const { allowances, ...salaryBreakdownData } = dto;

    // ✅ Update existing salary breakdown
    const result = await this.db
      .update(salaryBreakdown)
      .set(salaryBreakdownData)
      .where(eq(salaryBreakdown.company_id, company_id))
      .returning()
      .execute();

    // Handle Allowances
    if (Array.isArray(allowances) && allowances.length > 0) {
      for (const allowance of allowances) {
        const { allowance_type, allowance_percentage } = allowance;

        if (!allowance_type || !allowance_percentage) {
          continue; // Skip invalid entries
        }

        // Check if allowance already exists
        const existingAllowance = await this.db
          .select()
          .from(companyAllowances)
          .where(
            and(
              eq(companyAllowances.company_id, company_id),
              eq(companyAllowances.allowance_type, allowance_type),
            ),
          )
          .execute();

        if (existingAllowance.length > 0) {
          // Update existing allowance
          await this.db
            .update(companyAllowances)
            .set({ allowance_percentage })
            .where(
              and(
                eq(companyAllowances.company_id, company_id),
                eq(companyAllowances.allowance_type, allowance_type),
              ),
            )
            .execute();
        } else {
          // Insert new allowance
          await this.db
            .insert(companyAllowances)
            .values({
              company_id,
              allowance_type,
              allowance_percentage,
            })
            .execute();
        }
      }
    }

    return result;
  }

  // delete salary breakdown
  async deleteSalaryBreakdown(user_id: string, id: string) {
    console.log(id);
    await this.db
      .delete(companyAllowances)
      .where(eq(companyAllowances.id, id))
      .execute();
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
        amount: dto.amount * 100,
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

  // Payroll Preview Details

  async getPayrollPreviewDetails(company_id: string) {
    const allEmployees = await this.db
      .select({
        id: employees.id,
        employee_number: employees.employee_number,
        first_name: employees.first_name,
        last_name: employees.last_name,
        email: employees.email,
        annual_gross: employees.annual_gross,
        employment_status: employees.employment_status,
        group_id: employees.group_id,
        apply_nhf: employees.apply_nhf,
      })
      .from(employees)
      .where(eq(employees.company_id, company_id))
      .execute();

    const groups = await this.db
      .select({
        id: payGroups.id,
        name: payGroups.name,
        apply_pension: payGroups.apply_pension,
        apply_nhf: payGroups.apply_nhf,
        apply_paye: payGroups.apply_paye,
        apply_additional: payGroups.apply_additional,
      })
      .from(payGroups)
      .where(eq(payGroups.company_id, company_id))
      .execute();

    const payrollSummary = await this.getPayrollSummary(company_id);
    const salaryBreakdown = await this.getSalaryBreakdown(company_id);

    const customDeduction = await this.db
      .select({
        id: customDeductions.id,
        employee_id: customDeductions.employee_id,
        amount: customDeductions.amount,
      })
      .from(customDeductions)
      .where(eq(customDeductions.company_id, company_id))
      .execute();

    const bonuses = await this.db
      .select({
        employee_id: bonus.employee_id,
        amount: bonus.amount,
      })
      .from(bonus)
      .where(eq(bonus.company_id, company_id))
      .execute();

    const taxConfigDetails = await this.db
      .select({
        apply_pension: taxConfig.apply_pension,
        apply_nhf: taxConfig.apply_nhf,
        apply_paye: taxConfig.apply_paye,
      })
      .from(taxConfig)
      .where(eq(taxConfig.company_id, company_id))
      .execute();

    return {
      allEmployees,
      groups,
      payrollSummary,
      salaryBreakdown,
      customDeduction,
      bonuses,
      taxConfig: taxConfigDetails[0],
    };
  }
}
