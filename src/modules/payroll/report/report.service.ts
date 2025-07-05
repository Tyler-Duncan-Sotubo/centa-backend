import { Inject, Injectable } from '@nestjs/common';
import { departments, employees } from 'src/drizzle/schema';
import {
  and,
  eq,
  gte,
  sql,
  desc,
  countDistinct,
  sum,
  avg,
  max,
  min,
  asc,
} from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { payrollYtd } from '../schema/payroll-ytd.schema';
import { payroll } from '../schema/payroll-run.schema';
import { payGroups } from '../schema/pay-groups.schema';
import { employeeCompensations } from 'src/modules/core/employees/schema/compensation.schema';
import { PaySchedulesService } from '../pay-schedules/pay-schedules.service';
import Decimal from 'decimal.js';
import {
  repayments,
  salaryAdvance,
} from '../salary-advance/schema/salary-advance.schema';

@Injectable()
export class ReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly paySchedulesService: PaySchedulesService,
  ) {}

  async getLatestPayrollSummaryWithVariance(companyId: string) {
    const summaries = await this.db
      .select({
        payroll_run_id: payroll.payrollRunId,
        payroll_date: payroll.payrollDate,
        total_gross_salary: sql<number>`SUM(${payroll.grossSalary})`.as(
          'total_gross_salary',
        ),
        total_netSalary: sql<number>`SUM(${payroll.netSalary})`.as(
          'total_netSalary',
        ),
        total_deductions:
          sql<number>`SUM(${payroll.payeTax} + ${payroll.pensionContribution} + ${payroll.nhfContribution})`.as(
            'total_deductions',
          ),
        employee_count: sql<number>`COUNT(DISTINCT ${payroll.employeeId})`.as(
          'employee_count',
        ),
        totalPayrollCost:
          sql<number>`SUM(${payroll.netSalary} + ${payroll.pensionContribution} + ${payroll.nhfContribution} + ${payroll.employerPensionContribution})`.as(
            'totalPayrollCost',
          ),
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .groupBy(payroll.payrollRunId, payroll.payrollDate)
      .orderBy(desc(payroll.payrollDate))
      .limit(2) // Get current and previous
      .execute();

    if (summaries.length === 0) {
      return { current: null, variance: null };
    }

    const [current, previous] = summaries;

    const variance = {
      gross_salary_variance:
        (current.total_gross_salary ?? 0) - (previous?.total_gross_salary ?? 0),
      netSalary_variance:
        (current.total_netSalary ?? 0) - (previous?.total_netSalary ?? 0),
      deductions_variance:
        (current.total_deductions ?? 0) - (previous?.total_deductions ?? 0),
      payroll_cost_variance:
        (current.totalPayrollCost ?? 0) - (previous?.totalPayrollCost ?? 0),
      employee_count_variance:
        (current.employee_count ?? 0) - (previous?.employee_count ?? 0),
    };
    return {
      current,
      variance,
    };
  }

  /**
   * Retrieves the payroll variance for employees between the two most recent payroll runs
   * for a given company. The variance includes differences in gross salary, net salary,
   * PAYE tax, pension contributions, NHF contributions, and employer pension contributions.
   *
   * @param companyId - The ID of the company for which to retrieve payroll variance.
   * @returns An object containing the payroll run ID, payroll date, and a list of variances
   *          for each employee. If there are fewer than two payroll runs, an empty array is returned.
   */

  async getEmployeePayrollVariance(companyId: string) {
    const recentRuns = await this.db
      .select({
        payrollRunId: payroll.payrollRunId,
        payrollDate: payroll.payrollDate,
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .groupBy(payroll.payrollRunId, payroll.payrollDate)
      .orderBy(desc(payroll.payrollDate))
      .limit(2)
      .execute();

    if (recentRuns.length < 2) return null;

    const [currentRun, previousRun] = recentRuns;

    const [currentData, previousData] = await Promise.all([
      this.db
        .select({
          employeeId: payroll.employeeId,
          firstName: employees.firstName,
          lastName: employees.lastName,
          grossSalary: payroll.grossSalary,
          netSalary: payroll.netSalary,
          paye: payroll.payeTax,
          pension: payroll.pensionContribution,
          nhf: payroll.nhfContribution,
          employerPension: payroll.employerPensionContribution,
        })
        .from(payroll)
        .innerJoin(employees, eq(payroll.employeeId, employees.id))
        .where(eq(payroll.payrollRunId, currentRun.payrollRunId)),

      this.db
        .select({
          employeeId: payroll.employeeId,
          firstName: employees.firstName,
          lastName: employees.lastName,
          grossSalary: payroll.grossSalary,
          netSalary: payroll.netSalary,
          paye: payroll.payeTax,
          pension: payroll.pensionContribution,
          nhf: payroll.nhfContribution,
          employerPension: payroll.employerPensionContribution,
        })
        .from(payroll)
        .innerJoin(employees, eq(payroll.employeeId, employees.id))
        .where(eq(payroll.payrollRunId, previousRun.payrollRunId)),
    ]);

    const currMap = new Map(currentData.map((e) => [e.employeeId, e]));
    const prevMap = new Map(previousData.map((e) => [e.employeeId, e]));

    const allEmployeeIds = new Set([
      ...currentData.map((e) => e.employeeId),
      ...previousData.map((e) => e.employeeId),
    ]);

    const result = Array.from(allEmployeeIds).map((employeeId) => {
      const curr = currMap.get(employeeId) ?? {
        grossSalary: 0,
        netSalary: 0,
        paye: 0,
        pension: 0,
        nhf: 0,
        employerPension: 0,
        firstName: '',
        lastName: '',
      };

      const prev = prevMap.get(employeeId) ?? {
        grossSalary: 0,
        netSalary: 0,
        paye: 0,
        pension: 0,
        nhf: 0,
        employerPension: 0,
        firstName: '',
        lastName: '',
      };

      const get = (val: any) => new Decimal(val || 0);

      const firstName = curr.firstName ?? prev.firstName ?? 'Unknown';
      const lastName = curr.lastName ?? prev.lastName ?? '';
      const isNotInCurrent = !currMap.has(employeeId);

      const fullName =
        `${firstName} ${lastName}`.trim() +
        (isNotInCurrent
          ? `${prev.firstName} ${prev.lastName}(Not in recent payroll)'`
          : '');

      return {
        employeeId,
        fullName: fullName,
        previous: {
          grossSalary: get(prev.grossSalary),
          netSalary: get(prev.netSalary),
          paye: get(prev.paye),
          pension: get(prev.pension),
          nhf: get(prev.nhf),
          employerPension: get(prev.employerPension),
        },
        current: {
          grossSalary: get(curr.grossSalary),
          netSalary: get(curr.netSalary),
          paye: get(curr.paye),
          pension: get(curr.pension),
          nhf: get(curr.nhf),
          employerPension: get(curr.employerPension),
        },
        variance: {
          grossSalaryDiff: get(curr.grossSalary).minus(get(prev.grossSalary)),
          netSalaryDiff: get(curr.netSalary).minus(get(prev.netSalary)),
          payeDiff: get(curr.paye).minus(get(prev.paye)),
          pensionDiff: get(curr.pension).minus(get(prev.pension)),
          nhfDiff: get(curr.nhf).minus(get(prev.nhf)),
          employerPensionDiff: get(curr.employerPension).minus(
            get(prev.employerPension),
          ),
        },
      };
    });
    return {
      payrollRunId: currentRun.payrollRunId,
      payrollDate: currentRun.payrollDate,
      previousPayrollDate: previousRun.payrollDate,
      varianceList: result,
    };
  }

  async getVoluntaryDeductionTotals(companyId: string) {
    const rows = await this.db
      .select({
        payrollRunId: payroll.payrollRunId,
        voluntaryDeductions: payroll.voluntaryDeductions,
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .execute();

    const grouped = new Map<string, number>();

    for (const row of rows) {
      const voluntaryList = Array.isArray(row.voluntaryDeductions)
        ? row.voluntaryDeductions
        : [];

      const total = voluntaryList.reduce((sum, d) => {
        const amount = Number(d.amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      grouped.set(
        row.payrollRunId,
        (grouped.get(row.payrollRunId) || 0) + total,
      );
    }

    return grouped;
  }

  async getPayrollSummary(companyId: string) {
    const payrollTotal = await this.db
      .select({
        payrollRunId: payroll.payrollRunId,
        payrollDate: payroll.payrollDate,
        payrollMonth: payroll.payrollMonth,
        approvalStatus: payroll.approvalStatus,
        paymentStatus: payroll.paymentStatus,
        totalGrossSalary: sql<number>`SUM(${payroll.grossSalary})`.as(
          'total_gross_salary',
        ),
        employeeCount: sql<number>`COUNT(DISTINCT ${payroll.employeeId})`.as(
          'employee_count',
        ),
        totalDeductions: sql<number>`
          SUM(${payroll.payeTax} + ${payroll.pensionContribution} + ${payroll.nhfContribution} + ${payroll.salaryAdvance})
        `.as('total_deductions'),
        totalNetSalary: sql<number>`SUM(${payroll.netSalary})`.as(
          'total_netSalary',
        ),
        totalPayrollCost: sql<number>`
  SUM(
    ${payroll.grossSalary} + ${payroll.employerPensionContribution} +
    COALESCE(
      (SELECT SUM( (e->>'amount')::numeric )
       FROM jsonb_array_elements(${payroll.reimbursements}) AS e),
      0
    )
  )
`.as('totalPayrollCost'),
      })
      .from(payroll)
      .where(
        and(eq(payroll.companyId, companyId), eq(payroll.isOffCycle, false)),
      )
      .orderBy(desc(payroll.payrollDate))
      .groupBy(
        payroll.payrollRunId,
        payroll.payrollDate,
        payroll.payrollMonth,
        payroll.approvalStatus,
        payroll.paymentStatus,
      )
      .execute();

    // 1. Get voluntary deduction totals grouped by payrollRunId
    const voluntaryTotalsMap =
      await this.getVoluntaryDeductionTotals(companyId);

    // 2. Merge the voluntary deductions into each row
    const enriched = payrollTotal.map((row) => {
      const voluntary = voluntaryTotalsMap.get(row.payrollRunId) || 0;
      return {
        ...row,
        voluntaryDeductions: voluntary,
        totalDeductions: Number(row.totalDeductions) + voluntary,
      };
    });

    return enriched;
  }

  async getCombinedPayroll(companyId: string) {
    // Kick off all requests in parallel
    const [payrollSummary, nextPayDate] = await Promise.all([
      this.getPayrollSummary(companyId),
      this.paySchedulesService.getNextPayDate(companyId),
    ]);

    return {
      payrollSummary,
      nextPayDate,
    };
  }

  async getPayrollDashboard(companyId: string, month?: string) {
    const currentYear = new Date().getFullYear();

    // 1) Build WHERE clause for run summaries
    const whereRun: any[] = [eq(payroll.companyId, companyId)];
    if (month) {
      whereRun.push(eq(payroll.payrollMonth, month));
    }

    // 2) Per‐run summaries across one or all months
    let runSummaries = await this.db
      .select({
        payrollRunId: payroll.payrollRunId,
        payrollDate: payroll.payrollDate,
        payrollMonth: payroll.payrollMonth,
        approvalStatus: payroll.approvalStatus,
        paymentStatus: payroll.paymentStatus,
        totalGross: sql<number>`SUM(${payroll.grossSalary})`.as('totalGross'),
        totalDeductions: sql<number>`
        SUM(
          ${payroll.payeTax}
        + ${payroll.pensionContribution}
        + ${payroll.nhfContribution}
        + ${payroll.customDeductions}
        )
      `.as('totalDeductions'),
        totalBonuses: sql<number>`SUM(${payroll.bonuses})`.as('totalBonuses'),
        totalNet: sql<number>`SUM(${payroll.netSalary})`.as('totalNet'),
        employeeCount: sql<number>`COUNT(DISTINCT ${payroll.employeeId})`.as(
          'employeeCount',
        ),
        costPerRun: sql<number>`
        SUM(
          ${payroll.grossSalary}
        + ${payroll.employerPensionContribution}
        + ${payroll.bonuses}
        )
      `.as('costPerRun'),
      })
      .from(payroll)
      .where(and(...whereRun))
      .groupBy(
        payroll.payrollRunId,
        payroll.payrollDate,
        payroll.payrollMonth,
        payroll.approvalStatus,
        payroll.paymentStatus,
      )
      .orderBy(desc(payroll.payrollDate))
      .execute();

    // 2a) Compute run‐to‐run deltas (vs previous run in the same month or prior month)
    runSummaries = runSummaries.map((row, i, arr) => {
      const prev = arr[i + 1]; // since we order desc, next in array is previous date
      const deltaGross = prev ? row.totalGross - prev.totalGross : 0;
      const pctGross =
        prev && prev.totalGross ? (deltaGross / prev.totalGross) * 100 : 0;
      return {
        ...row,
        deltaGross,
        pctGross,
      };
    });

    // 3) Year‐to‐date totals
    const [ytdRow] = await this.db
      .select({
        totalGrossYTD: sql<number>`SUM(${payrollYtd.grossSalary})`.as(
          'totalGrossYTD',
        ),
        totalDeductionsYTD: sql<number>`SUM(${payrollYtd.totalDeductions})`.as(
          'totalDeductionsYTD',
        ),
        totalBonusesYTD: sql<number>`SUM(${payrollYtd.bonuses})`.as(
          'totalBonusesYTD',
        ),
        totalNetYTD: sql<number>`SUM(${payrollYtd.netSalary})`.as(
          'totalNetYTD',
        ),
        ytdEmployeeCount:
          sql<number>`COUNT(DISTINCT ${payrollYtd.employeeId})`.as(
            'ytdEmployeeCount',
          ),
      })
      .from(payrollYtd)
      .where(
        and(
          eq(payrollYtd.companyId, companyId),
          eq(payrollYtd.year, currentYear),
        ),
      )
      .execute();

    const yearToDate = {
      year: String(currentYear),
      totalGrossYTD: ytdRow?.totalGrossYTD ?? 0,
      totalDeductionsYTD: ytdRow?.totalDeductionsYTD ?? 0,
      totalBonusesYTD: ytdRow?.totalBonusesYTD ?? 0,
      totalNetYTD: ytdRow?.totalNetYTD ?? 0,
      employeeCountYTD: ytdRow?.ytdEmployeeCount ?? 0,
    };

    // 4) Current active headcount
    const [{ headcount }] = await this.db
      .select({ headcount: sql<number>`COUNT(*)`.as('headcount') })
      .from(employees)
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(employees.employmentStatus, 'active'),
        ),
      )
      .execute();

    // 5) Total current salary of active employees
    const [{ totalCurrentSalary }] = await this.db
      .select({
        totalCurrentSalary:
          sql<number>`SUM(${employeeCompensations.grossSalary})`.as(
            'totalCurrentSalary',
          ),
      })
      .from(employeeCompensations)
      .innerJoin(employees, eq(employeeCompensations.employeeId, employees.id))
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(employees.employmentStatus, 'active'),
        ),
      )
      .execute();

    // 6) Cost trend for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const startMonth = `${twelveMonthsAgo.getFullYear()}-${String(
      twelveMonthsAgo.getMonth() + 1,
    ).padStart(2, '0')}`;

    const rawTrend = await this.db
      .select({
        month: payrollYtd.payrollMonth,
        monthGross: sql<number>`SUM(${payrollYtd.grossSalary})`.as(
          'monthGross',
        ),
        monthDeductions: sql<number>`SUM(${payrollYtd.totalDeductions})`.as(
          'monthDeductions',
        ),
        monthBonuses: sql<number>`SUM(${payrollYtd.bonuses})`.as(
          'monthBonuses',
        ),
        monthNet: sql<number>`SUM(${payrollYtd.netSalary})`.as('monthNet'),
      })
      .from(payrollYtd)
      .where(
        and(
          eq(payrollYtd.companyId, companyId),
          gte(payrollYtd.payrollMonth, startMonth),
        ),
      )
      .groupBy(payrollYtd.payrollMonth)
      .orderBy(payrollYtd.payrollMonth)
      .execute();

    const costTrend = rawTrend.map((row, idx, arr) => {
      const prev = arr[idx - 1];
      const monthCost = row.monthGross + row.monthBonuses + row.monthDeductions;
      let deltaCost = 0,
        pctChange = 0;
      if (prev) {
        const prevCost =
          prev.monthGross + prev.monthBonuses + prev.monthDeductions;
        deltaCost = monthCost - prevCost;
        pctChange = prevCost ? (deltaCost / prevCost) * 100 : 0;
      }
      return {
        ...row,
        monthCost,
        deltaCost,
        pctChange,
      };
    });

    return {
      runSummaries, // array of all runs (or current month only if `month` passed), with deltaGross & pctGross
      yearToDate, // YTD totals
      headcount, // active headcount
      totalCurrentSalary, // sum of active employees’ gross salary
      costTrend, // last 12 months cost + deltas
    };
  }

  async getPayrollCostReport(companyId: string, month: string) {
    const [payGroupCost, departmentCost] = await Promise.all([
      this.getCostByPayGroup(companyId, month),
      this.getCostByDepartment(companyId, month),
    ]);

    return {
      payGroupCost: payGroupCost.map((row) => ({
        ...row,
        totalGross: row.totalGross ?? 0,
        totalNet: row.totalNet ?? 0,
        headcount: row.headcount ?? 0,
      })),
      departmentCost: departmentCost.map((row) => ({
        ...row,
        totalGross: row.totalGross ?? 0,
        totalNet: row.totalNet ?? 0,
        headcount: row.headcount ?? 0,
      })),
    };
  }

  async getCostByPayGroup(companyId: string, month: string) {
    return await this.db
      .select({
        payGroupId: payGroups.id,
        payGroupName: payGroups.name,
        totalGross: sql<number>`
        SUM(${payroll.grossSalary})
      `.as('totalGross'),
        totalNet: sql<number>`
        SUM(${payroll.netSalary})
      `.as('totalNet'),
        headcount: sql<number>`
        COUNT(DISTINCT ${payroll.employeeId})
      `.as('headcount'),
      })
      .from(payroll)
      // join to employees to get each record’s payGroupId
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      // then join to payGroups
      .innerJoin(payGroups, eq(employees.payGroupId, payGroups.id))
      .where(
        and(eq(payroll.companyId, companyId), eq(payroll.payrollMonth, month)),
      )
      .groupBy(payGroups.id, payGroups.name)
      .orderBy(desc(sql`SUM(${payroll.grossSalary})`))
      .execute();
  }

  async getCostByDepartment(companyId: string, month: string) {
    return await this.db
      .select({
        departmentName: departments.name,
        totalGross: sql<number>`SUM(${payroll.grossSalary})`.as('totalGross'),
        totalNet: sql<number>`SUM(${payroll.netSalary})`.as('totalNet'),
        headcount: sql<number>`COUNT(DISTINCT ${payroll.employeeId})`.as(
          'headcount',
        ),
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(eq(payroll.companyId, companyId), eq(payroll.payrollMonth, month)),
      )
      .groupBy(departments.id, departments.name)
      .execute();
  }

  async getTopBonusRecipients(companyId: string, month: string, limit = 10) {
    return await this.db
      .select({
        employeeId: payroll.employeeId,
        fullName:
          sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`.as(
            'fullName',
          ),
        bonus: sql<number>`SUM(${payroll.bonuses})`.as('bonus'),
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .where(
        and(eq(payroll.companyId, companyId), eq(payroll.payrollMonth, month)),
      )
      .groupBy(
        employees.id,
        employees.firstName,
        employees.lastName,
        payroll.employeeId,
      )
      .orderBy(desc(sql`SUM(${payroll.bonuses})`))
      .limit(limit)
      .execute();
  }

  private async getSalaryInsights(companyId: string) {
    const salaryBreakdown = await this.db
      .select({
        payrollMonth: payroll.payrollMonth,
        employeeId: payroll.employeeId,
        employeeName:
          sql`${employees.firstName} || ' ' || ${employees.lastName}`.as(
            'employeeName',
          ),
        grossSalary: sum(payroll.grossSalary).as('grossSalary'),
        netSalary: sum(payroll.netSalary).as('netSalary'),
        deductions: sum(payroll.totalDeductions).as('deductions'),
        bonuses: sum(payroll.bonuses).as('bonuses'),
        paymentStatus: payroll.paymentStatus,
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .where(eq(payroll.companyId, companyId))
      .groupBy(
        payroll.payrollMonth,
        payroll.employeeId,
        employees.firstName,
        employees.lastName,
        payroll.paymentStatus,
      )
      .execute();

    const stats = await this.db
      .select({
        avgSalary: avg(payroll.netSalary),
        highestPaid: max(payroll.netSalary),
        lowestPaid: min(payroll.netSalary),
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .execute();

    const distribution = await this.db
      .select({
        salaryRange: sql`
          CASE
            WHEN ${payroll.netSalary} < 50000 THEN 'Below 50K'
            WHEN ${payroll.netSalary} BETWEEN 50000 AND 100000 THEN '50K - 100K'
            WHEN ${payroll.netSalary} BETWEEN 100000 AND 200000 THEN '100K - 200K'
            WHEN ${payroll.netSalary} BETWEEN 200000 AND 500000 THEN '200K - 500K'
            WHEN ${payroll.netSalary} BETWEEN 500000 AND 1000000 THEN '500K - 1M'
            ELSE 'Above 1M'
          END
        `.as('salaryRange'),
        count: countDistinct(payroll.employeeId),
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .groupBy(
        sql`
        CASE
          WHEN ${payroll.netSalary} < 50000 THEN 'Below 50K'
          WHEN ${payroll.netSalary} BETWEEN 50000 AND 100000 THEN '50K - 100K'
          WHEN ${payroll.netSalary} BETWEEN 100000 AND 200000 THEN '100K - 200K'
          WHEN ${payroll.netSalary} BETWEEN 200000 AND 500000 THEN '200K - 500K'
          WHEN ${payroll.netSalary} BETWEEN 500000 AND 1000000 THEN '500K - 1M'
          ELSE 'Above 1M'
        END
      `,
      )
      .execute();

    const byDepartment = await this.db
      .select({
        departmentName: departments.name,
        totalNetSalary: sum(payroll.netSalary),
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(payroll.companyId, companyId))
      .groupBy(departments.name)
      .execute();

    return {
      breakdown: salaryBreakdown,
      stats: stats[0],
      distribution,
      byDepartment,
    };
  }

  async YtdReport(companyId: string) {
    const currentYear = new Date().getFullYear();
    // Fetch per-employee YTD breakdown
    const ytdData = await this.db
      .select({
        employeeId: payrollYtd.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeNumber: employees.employeeNumber,
        gross_salary_ytd: sql<number>`SUM(${payrollYtd.grossSalary}) `,
        net_salary_ytd: sql<number>`SUM(${payrollYtd.netSalary}) `,
        paye_tax_ytd: sql<number>`SUM(${payrollYtd.PAYE}) `,
        pension_contribution_ytd: sql<number>`SUM(${payrollYtd.pension}) `,
        employer_pension_contribution_ytd: sql<number>`SUM(${payrollYtd.employerPension}) `,
        nhf_contribution_ytd: sql<number>`SUM(${payrollYtd.nhf}) `,
      })
      .from(payrollYtd)
      .innerJoin(employees, eq(payrollYtd.employeeId, employees.id))
      .where(eq(payrollYtd.companyId, companyId))
      .groupBy(
        payrollYtd.employeeId,
        employees.firstName,
        employees.lastName,
        employees.employeeNumber,
      )
      .orderBy(asc(employees.employeeNumber))
      .execute();

    // Compute YTD company totals
    const [companyTotals] = await this.db
      .select({
        gross_salary_ytd: sql<number>`SUM(${payrollYtd.grossSalary})`,
        net_salary_ytd: sql<number>`SUM(${payrollYtd.netSalary})`,
        paye_tax_ytd: sql<number>`SUM(${payrollYtd.PAYE})`,
        pension_contribution_ytd: sql<number>`SUM(${payrollYtd.pension})`,
        employer_pension_contribution_ytd: sql<number>`SUM(${payrollYtd.employerPension})`,
        nhf_contribution_ytd: sql<number>`SUM(${payrollYtd.nhf})`,
      })
      .from(payrollYtd)
      .where(
        and(
          eq(payrollYtd.companyId, companyId),
          eq(payrollYtd.year, currentYear),
        ),
      )
      .execute();

    return {
      totals: companyTotals,
      employees: ytdData,
    };
  }

  async getPayrollAnalyticsReport(companyId: string, month?: string) {
    if (!month) {
      month = new Date().toISOString().slice(0, 7);
    }
    const [summary, salaryInsights, ytdData] = await Promise.all([
      this.getPayrollSummary(companyId),
      this.getSalaryInsights(companyId),
      this.YtdReport(companyId),
    ]);

    return {
      month: month ?? new Date().toISOString().slice(0, 7),
      summary,
      salaryInsights,
      ytdData,
    };
  }

  private async getDeductionBreakdownByMonth(companyId: string) {
    return await this.db
      .select({
        payrollMonth: payroll.payrollMonth,
        paye: sql<number>`SUM(${payroll.payeTax})`.as('paye'),
        pension: sql<number>`SUM(${payroll.pensionContribution})`.as('pension'),
        nhf: sql<number>`SUM(${payroll.nhfContribution})`.as('nhf'),
        custom: sql<number>`SUM(${payroll.customDeductions})`.as('custom'),
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .groupBy(payroll.payrollMonth)
      .orderBy(payroll.payrollMonth)
      .execute();
  }

  private async getEmployerCostBreakdownByMonth(companyId: string) {
    const rows = await this.db
      .select({
        payrollMonth: payroll.payrollMonth,
        gross: sql<number>`SUM(${payroll.grossSalary})`.as('gross'),
        employerPension:
          sql<number>`SUM(${payroll.employerPensionContribution})`.as(
            'employerPension',
          ),
        totalCost: sql<number>`
          SUM(${payroll.grossSalary} + ${payroll.employerPensionContribution})
        `.as('totalCost'),
      })
      .from(payroll)
      .where(eq(payroll.companyId, companyId))
      .groupBy(payroll.payrollMonth)
      .orderBy(payroll.payrollMonth)
      .execute();

    return rows;
  }

  async getDeductionsByEmployee(companyId: string, month: string) {
    const payrolls = await this.db
      .select({
        employeeId: payroll.employeeId,
        paye: payroll.payeTax,
        pension: payroll.pensionContribution,
        nhf: payroll.nhfContribution,
        salaryAdvance: payroll.salaryAdvance,
        voluntary: payroll.voluntaryDeductions, // JSON
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(payroll)
      .leftJoin(employees, eq(employees.id, payroll.employeeId))
      .where(
        and(eq(payroll.companyId, companyId), eq(payroll.payrollMonth, month)),
      )
      .execute();

    return payrolls.map((row) => {
      const voluntaryTotal = Array.isArray(row.voluntary)
        ? row.voluntary.reduce((sum, d) => sum + Number(d.amount || 0), 0)
        : 0;

      const total =
        Number(row.paye) +
        Number(row.pension) +
        Number(row.nhf) +
        Number(row.salaryAdvance) +
        voluntaryTotal;

      return {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        paye: row.paye,
        pension: row.pension,
        nhf: row.nhf,
        salaryAdvance: row.salaryAdvance,
        voluntary: voluntaryTotal,
        total,
      };
    });
  }

  async getDeductionsSummary(companyId: string, month?: string) {
    const [deductionBreakdown, employerCostBreakdown, deductionByEmployee] =
      await Promise.all([
        this.getDeductionBreakdownByMonth(companyId),
        this.getEmployerCostBreakdownByMonth(companyId),
        this.getDeductionsByEmployee(
          companyId,
          month ?? new Date().toISOString().slice(0, 7),
        ),
      ]);

    return {
      deductionBreakdown,
      employerCostBreakdown,
      deductionByEmployee,
    };
  }

  async getLoanFullReport(companyId: string) {
    // Run both queries in parallel for performance
    const [outstandingSummary, monthlySummary] = await Promise.all([
      this.db
        .select({
          employeeId: salaryAdvance.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          totalLoanAmount: salaryAdvance.amount,
          totalRepaid: salaryAdvance.totalPaid,
          outstanding:
            sql<number>`(${salaryAdvance.amount} - ${salaryAdvance.totalPaid})`.as(
              'outstanding',
            ),
          status: salaryAdvance.status,
        })
        .from(salaryAdvance)
        .innerJoin(employees, eq(salaryAdvance.employeeId, employees.id))
        .where(eq(salaryAdvance.companyId, companyId))
        .execute(),

      this.db
        .select({
          year: sql<number>`EXTRACT(YEAR FROM ${salaryAdvance.createdAt})`.as(
            'year',
          ),
          month: sql<number>`EXTRACT(MONTH FROM ${salaryAdvance.createdAt})`.as(
            'month',
          ),
          status: salaryAdvance.status,
          totalLoanAmount: sql<number>`SUM(${salaryAdvance.amount})`.as(
            'totalLoanAmount',
          ),
          totalRepaid: sql<number>`SUM(${salaryAdvance.totalPaid})`.as(
            'totalRepaid',
          ),
          totalOutstanding:
            sql<number>`SUM(${salaryAdvance.amount} - ${salaryAdvance.totalPaid})`.as(
              'totalOutstanding',
            ),
        })
        .from(salaryAdvance)
        .where(eq(salaryAdvance.companyId, companyId))
        .groupBy(
          sql`EXTRACT(YEAR FROM ${salaryAdvance.createdAt})`,
          sql`EXTRACT(MONTH FROM ${salaryAdvance.createdAt})`,
          salaryAdvance.status,
        )
        .orderBy(
          sql`EXTRACT(YEAR FROM ${salaryAdvance.createdAt}) DESC`,
          sql`EXTRACT(MONTH FROM ${salaryAdvance.createdAt}) DESC`,
        )
        .execute(),
    ]);

    return {
      outstandingSummary,
      monthlySummary,
    };
  }

  async getLoanRepaymentReport(companyId: string) {
    const rows = await this.db
      .select({
        employeeId: employees.id,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        totalRepaid: sql<number>`SUM(${repayments.amountPaid})`.as(
          'totalRepaid',
        ),
        repaymentCount: sql<number>`COUNT(${repayments.id})`.as(
          'repaymentCount',
        ),
        firstRepayment: sql<string>`MIN(${repayments.paidAt})`.as(
          'firstRepayment',
        ),
        lastRepayment: sql<string>`MAX(${repayments.paidAt})`.as(
          'lastRepayment',
        ),
      })
      .from(repayments)
      .innerJoin(
        salaryAdvance,
        eq(repayments.salaryAdvanceId, salaryAdvance.id),
      )
      .innerJoin(employees, eq(salaryAdvance.employeeId, employees.id))
      .where(eq(salaryAdvance.companyId, companyId))
      .groupBy(employees.id, employees.firstName, employees.lastName)
      .orderBy(employees.firstName)
      .execute();

    return rows;
  }
}
