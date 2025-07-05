import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { offCyclePayroll } from '../schema/off-cycle.schema';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { employees } from 'src/drizzle/schema';
import { payroll } from '../../schema/payroll-run.schema';

@Injectable()
export class OffCycleReportService {
  constructor(@Inject(DRIZZLE) private db: db) {}

  async getOffCycleSummary(
    companyId: string,
    fromDate: string, // e.g. "2025-05-01"
    toDate: string, // e.g. "2025-05-31"
  ) {
    return this.db
      .select({
        employeeId: offCyclePayroll.employeeId,
        name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        payrollDate: offCyclePayroll.payrollDate,
        type: offCyclePayroll.type,
        amount: offCyclePayroll.amount,
        taxable: offCyclePayroll.taxable,
      })
      .from(offCyclePayroll)
      .innerJoin(employees, eq(offCyclePayroll.employeeId, employees.id))
      .where(
        and(
          eq(offCyclePayroll.companyId, companyId),
          gte(offCyclePayroll.payrollDate, fromDate),
          lte(offCyclePayroll.payrollDate, toDate),
        ),
      )
      .orderBy(offCyclePayroll.payrollDate)
      .execute();
  }

  async getOffCycleVsRegular(
    companyId: string,
    month: string, // e.g. "2025-05"
  ) {
    // default as current month
    if (!month) {
      const date = new Date();
      month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
      )}`;
    }

    // A) Regular payroll (isOffCycle = false)
    const [{ regGross, regTax, regNet }] = await this.db
      .select({
        regGross: sql<number>`SUM(${payroll.grossSalary})`,
        // total tax = PAYE + NHF + employee pension
        regTax: sql<number>`
        SUM(
          ${payroll.payeTax}
          + ${payroll.nhfContribution}
          + ${payroll.pensionContribution}
        )
      `,
        regNet: sql<number>`SUM(${payroll.netSalary})`,
      })
      .from(payroll)
      .where(
        and(
          eq(payroll.companyId, companyId),
          eq(payroll.payrollMonth, month),
          eq(payroll.isOffCycle, false),
        ),
      )
      .execute();

    // B) Off-cycle payroll (isOffCycle = true)
    const [{ offGross, offTax, offNet }] = await this.db
      .select({
        offGross: sql<number>`SUM(${payroll.grossSalary})`,
        offTax: sql<number>`
        SUM(
          ${payroll.payeTax}
          + ${payroll.nhfContribution}
          + ${payroll.pensionContribution}
        )
      `,
        offNet: sql<number>`SUM(${payroll.netSalary})`,
      })
      .from(payroll)
      .where(
        and(
          eq(payroll.companyId, companyId),
          eq(payroll.payrollMonth, month),
          eq(payroll.isOffCycle, true),
        ),
      )
      .execute();

    return {
      regular: { gross: regGross ?? 0, tax: regTax ?? 0, net: regNet ?? 0 },
      offCycle: { gross: offGross ?? 0, tax: offTax ?? 0, net: offNet ?? 0 },
      offPercent: regGross ? ((offGross ?? 0) / regGross) * 100 : 0,
    };
  }

  async getOffCycleByEmployee(companyId: string, employeeId: string) {
    return this.db
      .select({
        payrollDate: offCyclePayroll.payrollDate,
        type: offCyclePayroll.type,
        amount: offCyclePayroll.amount,
        taxable: offCyclePayroll.taxable,
        remarks: offCyclePayroll.notes,
        netPaid: payroll.netSalary,
      })
      .from(offCyclePayroll)
      .innerJoin(
        payroll,
        and(
          eq(offCyclePayroll.payrollRunId, payroll.payrollRunId),
          eq(offCyclePayroll.employeeId, payroll.employeeId),
          eq(payroll.isOffCycle, true),
        ),
      )
      .where(
        and(
          eq(offCyclePayroll.companyId, companyId),
          eq(offCyclePayroll.employeeId, employeeId),
        ),
      )
      .orderBy(offCyclePayroll.payrollDate)
      .execute();
  }

  // 4) Off-Cycle Type Breakdown
  async getOffCycleTypeBreakdown(
    companyId: string,
    month?: string, // "2025-05"
  ) {
    const qb = this.db
      .select({
        type: offCyclePayroll.type,
        total: sql<number>`SUM(${payroll.grossSalary})`,
      })
      .from(offCyclePayroll)
      // join to pick up grossSalary in payroll for the same run & employee
      .innerJoin(
        payroll,
        and(
          eq(offCyclePayroll.payrollRunId, payroll.payrollRunId),
          eq(offCyclePayroll.employeeId, payroll.employeeId),
          eq(payroll.companyId, companyId),
          eq(payroll.isOffCycle, true),
        ),
      );

    if (month) {
      qb.where(eq(payroll.payrollMonth, month));
    }

    return qb
      .groupBy(offCyclePayroll.type)
      .orderBy(sql`SUM(${payroll.grossSalary}) DESC`)
      .execute();
  }

  // 5) Off-Cycle Tax Impact Report
  async getOffCycleTaxImpact(
    companyId: string,
    month?: string, // optional "2025-05"
  ) {
    // A) All off-cycle runs with their stored tax & net
    const lines = await this.db
      .select({
        payrollDate: payroll.payrollDate,
        gross: payroll.grossSalary,
        pension: payroll.pensionContribution,
        nhf: payroll.nhfContribution,
        paye: payroll.payeTax,
        net: payroll.netSalary,
        type: offCyclePayroll.type,
      })
      .from(offCyclePayroll)
      .innerJoin(
        payroll,
        and(
          eq(offCyclePayroll.payrollRunId, payroll.payrollRunId),
          eq(offCyclePayroll.employeeId, payroll.employeeId),
          eq(payroll.isOffCycle, true),
          eq(payroll.companyId, companyId),
        ),
      )
      .where(
        and(
          eq(payroll.companyId, companyId),
          eq(payroll.isOffCycle, true),
          month ? eq(payroll.payrollMonth, month) : sql`TRUE`,
        ),
      )
      .orderBy(payroll.payrollDate)
      .execute();

    // B) Total regular-cycle tax in same period
    const [{ regTax = 0 }] = await this.db
      .select({
        regTax: sql<number>`
        SUM(${payroll.payeTax} + ${payroll.nhfContribution} + ${payroll.pensionContribution})
      `,
      })
      .from(payroll)
      .where(
        and(
          eq(payroll.companyId, companyId),
          eq(payroll.isOffCycle, false),
          month ? eq(payroll.payrollMonth, month) : sql`TRUE`,
        ),
      )
      .execute();

    return { lines, totalRegularTax: regTax };
  }

  async getOffCycleDashboard(
    companyId: string,
    options?: {
      month?: string; // e.g. "2025-05"
      fromDate?: string; // e.g. "2025-05-01"
      toDate?: string; // e.g. "2025-05-31"
      employeeId?: string; // for per-employee report
    },
  ) {
    const { month, fromDate, toDate, employeeId } = options || {};

    const [summary, vsRegular, byEmployee, typeBreakdown, taxImpact] =
      await Promise.all([
        // 1) Off-Cycle Summary
        this.getOffCycleSummary(
          companyId,
          fromDate ?? '1900-01-01',
          toDate ?? '2999-12-31',
        ),

        // 2) Off-Cycle vs Regular
        this.getOffCycleVsRegular(
          companyId,
          month ?? new Date().toISOString().slice(0, 7),
        ),

        // 3) Off-Cycle by Employee (only if employeeId provided; else empty)
        employeeId
          ? this.getOffCycleByEmployee(companyId, employeeId)
          : Promise.resolve([]),

        // 4) Type Breakdown
        this.getOffCycleTypeBreakdown(companyId, month),

        // 5) Tax Impact
        this.getOffCycleTaxImpact(companyId, month),
      ]);

    return {
      summary, // Array<{ employeeId, name, payrollDate, type, amount, taxable }>
      vsRegular, // { regular: { gross, tax, net }, offCycle: { gross, tax, net }, offPercent }
      byEmployee, // Array<{ payrollDate, type, amount, taxable, remarks, netPaid }>
      typeBreakdown, // Array<{ type, total }>
      taxImpact, // { lines: Array<{ payrollDate, gross, pension, nhf, paye, net, type }>, totalRegularTax }
    };
  }

  async getOffCyclePayrollSummary(companyId: string) {
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
        and(eq(payroll.companyId, companyId), eq(payroll.isOffCycle, true)),
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

    // 2. Merge the voluntary deductions into each row
    const enriched = payrollTotal.map((row) => {
      return {
        ...row,
        totalDeductions: Number(row.totalDeductions),
      };
    });

    return enriched;
  }
}
