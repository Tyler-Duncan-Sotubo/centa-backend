import { Injectable, Inject } from '@nestjs/common';
import {
  avg,
  count,
  countDistinct,
  eq,
  max,
  min,
  sql,
  sum,
  desc,
  and,
  between,
  inArray,
} from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { payroll } from 'src/drizzle/schema/payroll.schema';
import { employees } from 'src/drizzle/schema/employee.schema';
import { departments } from 'src/drizzle/schema/department.schema';
import { repayments, salaryAdvance } from 'src/drizzle/schema/loans.schema';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  async getPayrollOverview(company_id: string) {
    const overview = await this.db
      .select({
        payrollMonth: payroll.payroll_month,
        totalPayrollCost: sum(payroll.gross_salary),
        totalNetSalaries: sum(payroll.net_salary),
        totalDeductions: sum(payroll.total_deductions),
        totalBonuses: sum(payroll.bonuses),
        employeesProcessed: count(),
        paymentStatus: payroll.payment_status,
      })
      .from(payroll)
      .where(eq(payroll.company_id, company_id))
      .groupBy(payroll.payroll_month, payroll.payment_status)
      .orderBy(desc(payroll.payroll_month)) // Sort by latest first
      .execute();

    return overview;
  }

  async employeesSalaryBreakdown(company_id: string) {
    return await this.db.transaction(async (tx) => {
      // Fetch Salary Breakdown per Employee
      const salaryBreakdown = await tx
        .select({
          payrollMonth: payroll.payroll_month,
          employeeId: payroll.employee_id,
          employeeName:
            sql`${employees.first_name} || ' ' || ${employees.last_name}`.as(
              'employeeName',
            ),
          grossSalary: sum(payroll.gross_salary).as('grossSalary'),
          netSalary: sum(payroll.net_salary).as('netSalary'),
          deductions: sum(payroll.total_deductions).as('deductions'),
          bonuses: sum(payroll.bonuses).as('bonuses'),
          paymentStatus: payroll.payment_status, // Assuming status is the same per month
        })
        .from(payroll)
        .innerJoin(employees, eq(payroll.employee_id, employees.id))
        .where(eq(payroll.company_id, company_id))
        .groupBy(
          payroll.payroll_month,
          payroll.employee_id,
          employees.first_name,
          employees.last_name,
          payroll.payment_status,
        )
        .execute();

      // Fetch Aggregate Salary Stats
      const salaryStats = await tx
        .select({
          avgSalary: avg(payroll.net_salary).as('avgSalary'),
          highestPaid: max(payroll.net_salary).as('highestPaid'),
          lowestPaid: min(payroll.net_salary).as('lowestPaid'),
        })
        .from(payroll)
        .where(eq(payroll.company_id, company_id))
        .execute();

      // Fetch Salary Distribution
      const salaryDistribution = await tx
        .select({
          salaryRange: sql`
          CASE
            WHEN ${payroll.net_salary} < 5000000 THEN 'Below 50K'
            WHEN ${payroll.net_salary} BETWEEN 5000000 AND 10000000 THEN '50K - 100K'
            WHEN ${payroll.net_salary} BETWEEN 10000000 AND 20000000 THEN '100K - 200K'
            WHEN ${payroll.net_salary} BETWEEN 20000000 AND 50000000 THEN '200K - 500K'
            WHEN ${payroll.net_salary} BETWEEN 50000000 AND 100000000 THEN '500K - 1M'
            ELSE 'Above 1M'
          END
        `.as('salaryRange'),
          count: countDistinct(payroll.employee_id).as('count'), // Count unique employees
        })
        .from(payroll)
        .where(eq(payroll.company_id, company_id))
        .groupBy(
          sql`
          CASE
            WHEN ${payroll.net_salary} < 5000000 THEN 'Below 50K'
            WHEN ${payroll.net_salary} BETWEEN 5000000 AND 10000000 THEN '50K - 100K'
            WHEN ${payroll.net_salary} BETWEEN 10000000 AND 20000000 THEN '100K - 200K'
            WHEN ${payroll.net_salary} BETWEEN 20000000 AND 50000000 THEN '200K - 500K'
            WHEN ${payroll.net_salary} BETWEEN 50000000 AND 100000000 THEN '500K - 1M'
            ELSE 'Above 1M'
          END
        `,
        )
        .execute();

      // Fetch Spend by Department
      const spendByDepartment = await tx
        .select({
          totalNetSalary: sum(payroll.net_salary).as('totalNetSalary'),
          departmentName: departments.name,
        })
        .from(payroll)
        .innerJoin(employees, eq(payroll.employee_id, employees.id))
        .innerJoin(departments, eq(employees.department_id, departments.id))
        .where(eq(payroll.company_id, company_id))
        .groupBy(departments.name)
        .execute();

      return {
        salaryBreakdown, // List of employees' salaries
        salaryStats: salaryStats[0], // Avg, highest, lowest salaries
        salaryDistribution, // Salary range distribution
        spendByDepartment, // Spend grouped by department
      };
    });
  }

  async getDeductionsReport(company_id: string) {
    // 1. Monthly Deductions Summary per Company
    const deductions = await this.db
      .select({
        payroll_month: payroll.payroll_month,
        paye: sql<number>`SUM(${payroll.paye_tax})`,
        pension: sql<number>`SUM(${payroll.pension_contribution} + ${payroll.employer_pension_contribution})`,
        nhf: sql<number>`SUM(${payroll.nhf_contribution})`,
        custom: sql<number>`SUM(${payroll.custom_deductions})`,
      })
      .from(payroll)
      .where(eq(payroll.company_id, company_id))
      .orderBy(payroll.payroll_month)
      .groupBy(payroll.payroll_month);

    // 2. Top 5 Employees with Highest Deductions
    const topEmployees = await this.db
      .select({
        employee_name:
          sql`${employees.first_name} || ' ' || ${employees.last_name}`.as(
            'employee_name',
          ),
        total_deductions: sum(payroll.total_deductions).as('total_deductions'),
      })
      .from(payroll)
      .where(eq(payroll.company_id, company_id))
      .innerJoin(employees, eq(payroll.employee_id, employees.id))
      .groupBy(employees.first_name, employees.last_name)
      .orderBy(sql`SUM(${payroll.total_deductions}) DESC`)
      .limit(5);

    return { deductions, topEmployees };
  }

  async getCompanyFinanceReport(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter =
      startDate && endDate
        ? between(
            salaryAdvance.createdAt,
            new Date('2025-01-01'),
            new Date('2025-01-03'),
          )
        : undefined;

    // Fetch salary advances (loans)
    const salaryAdvances = await this.db
      .select({
        id: salaryAdvance.id,
        amount: salaryAdvance.amount,
        status: salaryAdvance.status,
        employeeName:
          sql`${employees.first_name} || ' ' || ${employees.last_name}`.as(
            'employeeName',
          ),
      })
      .from(salaryAdvance)
      .innerJoin(employees, eq(salaryAdvance.employee_id, employees.id))
      .where(and(eq(salaryAdvance.company_id, companyId), dateFilter))
      .execute();

    // Fetch repayments and calculate outstanding balances
    let totalLoanAmount = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;
    const statusBreakdown: Record<string, number> = {};

    const repaymentData = await this.db
      .select({
        loanId: repayments.salary_advance_id,
        totalPaid: sum(repayments.amount_paid),
      })
      .from(repayments)
      .where(
        // Ensure we only fetch repayments for loans from this company
        inArray(
          repayments.salary_advance_id,
          salaryAdvances.map((loan) => loan.id),
        ),
      )
      .groupBy(repayments.salary_advance_id)
      .execute();

    const repaymentMap = new Map(
      repaymentData.map((r) => [r.loanId, r.totalPaid || 0]),
    );

    for (const loan of salaryAdvances) {
      totalLoanAmount += loan.amount;
      const totalPaid = repaymentMap.get(loan.id) || 0;
      const outstandingBalance = loan.amount - parseFloat(totalPaid.toString());

      totalRepaid += parseFloat(totalPaid.toString());
      totalOutstanding += outstandingBalance;

      // Track loan status counts
      statusBreakdown[loan.status] = (statusBreakdown[loan.status] || 0) + 1;
    }

    // Fetch and group bonuses
    const bonuses = await this.db
      .select({
        payrollMonth: payroll.payroll_month,
        totalBonuses: sum(payroll.bonuses),
        paymentStatus: payroll.payment_status,
      })
      .from(payroll)
      .where(and(eq(payroll.company_id, companyId), dateFilter))
      .groupBy(payroll.payroll_month, payroll.payment_status)
      .orderBy(desc(payroll.payroll_month))
      .execute();

    const removeBonus = bonuses.filter(
      (bonus) => Number(bonus.totalBonuses) !== 0,
    );

    return {
      report_period:
        startDate && endDate ? `${startDate} to ${endDate}` : 'All Time',
      loans: {
        total_loans_given: totalLoanAmount,
        total_repaid: totalRepaid,
        total_outstanding: totalOutstanding,
        status_breakdown: statusBreakdown,
        details: salaryAdvances,
      },
      bonuses: {
        details: removeBonus,
      },
    };
  }
}
