// src/modules/reports/report.service.ts

import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ExportUtil } from 'src/utils/export.util';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { ReportService } from './report.service';
import { decrypt } from 'src/utils/crypto.util';
import {
  companies,
  employeeFinancials,
  employees,
  jobRoles,
} from 'src/drizzle/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { payroll } from '../schema/payroll-run.schema';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { payrollYtd } from '../schema/payroll-ytd.schema';
import { ExportMatrixUtil } from 'src/utils/export-matrix-to-csv';
import Decimal from 'decimal.js';
import { deductionTypes } from '../schema/deduction.schema';
import { payrollAllowances } from '../schema/payroll-allowances.schema';
import { slugify } from 'src/utils/slugify';

@Injectable()
export class GenerateReportService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly payrollService: ReportService,
    private readonly awsService: S3StorageService,
  ) {}

  private format = (val: Decimal | number | string) =>
    new Decimal(val).toNumber().toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  private formatNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  private async exportAndUpload<T>(
    rows: T[],
    columns: { field: string; title: string }[],
    filenameBase: string,
    companyId: string,
    folder: string,
  ) {
    if (!rows.length) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    const filePath = await ExportUtil.exportToCSV(rows, columns, filenameBase, {
      textFields: ['bank_account_number', 'employee_number'],
    });

    return this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      folder,
    );
  }

  private async exportAndUploadExcel<T>(
    rows: T[],
    columns: { field: string; title: string }[],
    filenameBase: string,
    companyId: string,
    folder: string,
  ) {
    if (!rows.length) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    const filePath = await ExportUtil.exportToExcel(
      rows,
      columns,
      filenameBase,
    );

    return this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      folder,
    );
  }

  private async exportAndUploadMatrix<T extends Record<string, any>>(
    rows: T[],
    columns: { field: string; title: string }[],
    filenameBase: string,
    companyId: string,
    folder: string,
  ) {
    if (!rows || rows.length === 0) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    // Generate CSV file from matrix-style rows
    const filePath = ExportMatrixUtil.exportMatrixToCSV(
      rows,
      columns.map((col) => ({ field: col.field as string, title: col.title })),
      filenameBase,
    );

    // Upload the file to the specified S3 path
    return this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      folder,
    );
  }

  async downloadPayslipsToS3(
    companyId: string,
    payrollRunId: string,
    format:
      | 'internal'
      | 'bank'
      | 'nhf'
      | 'pension'
      | 'paye'
      | 'payment_schedule'
      | 'daily_schedule',
  ) {
    const payslips = await this.db
      .selectDistinctOn([employees.employeeNumber], {
        employee_number: employees.employeeNumber,
        first_name: employees.firstName,
        last_name: employees.lastName,
        email: employees.email,
        issued_at: payroll.createdAt,

        employment_start_date: employees.employmentStartDate,

        gross_salary: sql<number | null>`payroll.gross_salary`,
        net_salary: sql<number | null>`payroll.net_salary`,
        paye_tax: sql<number | null>`payroll.paye_tax`,
        pension_contribution: sql<number | null>`payroll.pension_contribution`,
        employer_pension_contribution: sql<
          number | null
        >`payroll.employer_pension_contribution`,
        nhf_contribution: sql<number | null>`payroll.nhf_contribution`,

        bonuses: sql<number | null>`payroll.bonuses`,
        salary_advance: sql<number | null>`payroll.salary_advance`,
        total_deductions: sql<number | null>`payroll.total_deductions`,

        payroll_month: payroll.payrollMonth,

        bank_name: employeeFinancials.bankName,
        bank_account_number: employeeFinancials.bankAccountNumber,

        payroll_id: payroll.id,
        voluntaryDeductions: payroll.voluntaryDeductions,
        expenses: payroll.reimbursements,
        companyName: companies.name,

        designation: jobRoles.title,
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .innerJoin(companies, eq(payroll.companyId, companies.id))
      .leftJoin(
        employeeFinancials,
        eq(employees.id, employeeFinancials.employeeId),
      )
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .where(
        and(
          eq(payroll.payrollRunId, payrollRunId),
          eq(employees.companyId, companyId),
        ),
      )
      .orderBy(asc(employees.employeeNumber))
      .execute();

    if (!payslips || payslips.length === 0) return null;

    const types = await this.db
      .select({ id: deductionTypes.id, name: deductionTypes.name })
      .from(deductionTypes)
      .execute();

    const typeMap = new Map(types.map((t) => [t.id, t.name]));

    const allTypes = new Set<string>();
    for (const p of payslips) {
      const voluntary = Array.isArray(p.voluntaryDeductions)
        ? p.voluntaryDeductions
        : [];
      for (const d of voluntary) {
        const name = typeMap.get(d.typeId) || d.typeId;
        allTypes.add(name);
      }
    }

    const NAIRA = '\u20A6';

    const formatNaira = (
      value: unknown,
      opts?: { blankZero?: boolean },
    ): string | null => {
      const blankZero = opts?.blankZero ?? false;

      if (value === null || value === undefined || value === '') return null;

      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return null;

      if (blankZero && num === 0) return null;

      return `${NAIRA}${num.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const getWorkingDays = (monthDate: Date, startDate?: Date | null) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const effectiveStart =
        startDate &&
        startDate.getFullYear() === year &&
        startDate.getMonth() === month &&
        startDate > monthStart
          ? startDate
          : monthStart;

      if (startDate && startDate > monthEnd) return 0;

      let workingDays = 0;
      for (
        let d = new Date(effectiveStart);
        d <= monthEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) workingDays++;
      }
      return workingDays;
    };

    const voluntaryColumns = Array.from(allTypes).map((name) => ({
      field: name,
      title: `${name} (${NAIRA})`,
    }));

    const expenseColumns: Array<{ field: string; title: string }> = [];
    for (const p of payslips) {
      const expenses = Array.isArray(p.expenses) ? p.expenses : [];
      for (const expense of expenses) {
        if (!expenseColumns.some((c) => c.field === expense.expenseName)) {
          expenseColumns.push({
            field: expense.expenseName,
            title: `Reimbursement ${expense.expenseName} (${NAIRA})`,
          });
        }
      }
    }

    let columns: any[];

    if (format === 'payment_schedule') {
      columns = [
        { field: 'employee_name', title: 'Employee Name' },
        { field: 'bank_name', title: 'Bank name' },
        { field: 'bank_account_number', title: 'Account number' },
        { field: 'gross_pay', title: `Gross Pay (${NAIRA})` },
        { field: 'deductions_total', title: `Deductions (${NAIRA})` },
        {
          field: 'bonus_allowances_total',
          title: `Bonus/Allowances (${NAIRA})`,
        },
        { field: 'net_pay', title: `Net Pay (${NAIRA})` },
      ];
    } else if (format === 'daily_schedule') {
      // ✅ FIX: include voluntary + expenses so the schedule balances and is reconcilable
      columns = [
        { field: 'sn', title: 'S/N' },
        { field: 'employee_name', title: 'Employee Name' },
        { field: 'designation', title: 'Designation' },
        { field: 'working_days', title: 'Working Days' },
        { field: 'daily_pay', title: `Daily Pay (${NAIRA})` },
        { field: 'gross_pay', title: `Gross Pay (${NAIRA})` },
        {
          field: 'bonus_allowances_total',
          title: `Bonus/Allowances (${NAIRA})`,
        },

        ...expenseColumns, // optional but recommended for balancing bonus/allowances
        { field: 'salary_advance', title: `Salary Advance/Loan (${NAIRA})` },
        ...voluntaryColumns, // ✅ THIS is what you asked for

        { field: 'deductions_total', title: `Total Deductions (${NAIRA})` },
        { field: 'net_pay', title: `Net Pay (${NAIRA})` },
      ];
    } else if (format === 'bank') {
      columns = [
        { field: 'employee_number', title: 'Employee Number' },
        { field: 'first_name', title: 'First Name' },
        { field: 'last_name', title: 'Last Name' },
        { field: 'bank_name', title: 'Bank Name' },
        { field: 'bank_account_number', title: 'Bank Account Number' },
        { field: 'net_salary', title: `Net Salary (${NAIRA})` },
      ];
    } else if (format === 'nhf') {
      columns = [
        { field: 'employee_number', title: 'Employee Number' },
        { field: 'first_name', title: 'First Name' },
        { field: 'last_name', title: 'Last Name' },
        { field: 'nhf_contribution', title: `NHF Contribution (${NAIRA})` },
        { field: 'payroll_month', title: 'Payroll Month' },
      ];
    } else if (format === 'pension') {
      columns = [
        { field: 'employee_number', title: 'Employee Number' },
        { field: 'first_name', title: 'First Name' },
        { field: 'last_name', title: 'Last Name' },
        { field: 'pension_contribution', title: `Employee Pension (${NAIRA})` },
        {
          field: 'employer_pension_contribution',
          title: `Employer Pension (${NAIRA})`,
        },
        { field: 'payroll_month', title: 'Payroll Month' },
      ];
    } else if (format === 'paye') {
      columns = [
        { field: 'employee_number', title: 'Employee Number' },
        { field: 'first_name', title: 'First Name' },
        { field: 'last_name', title: 'Last Name' },
        { field: 'paye_tax', title: `PAYE Tax (${NAIRA})` },
        { field: 'payroll_month', title: 'Payroll Month' },
      ];
    } else {
      columns = [
        { field: 'employee_number', title: 'Employee Number' },
        { field: 'first_name', title: 'First Name' },
        { field: 'last_name', title: 'Last Name' },
        { field: 'email', title: 'Email' },
        { field: 'gross_salary', title: `Gross Salary (${NAIRA})` },
        { field: 'paye_tax', title: `PAYE Tax (${NAIRA})` },
        { field: 'nhf_contribution', title: `NHF Contribution (${NAIRA})` },
        { field: 'pension_contribution', title: `Employee Pension (${NAIRA})` },
        ...voluntaryColumns,
        ...expenseColumns,
        { field: 'net_salary', title: `Net Salary (${NAIRA})` },
        {
          field: 'employer_pension_contribution',
          title: `Employer Pension (${NAIRA})`,
        },
        { field: 'payroll_month', title: 'Payroll Month' },
        { field: 'issued_at', title: 'Issued Date' },
      ];
    }

    let totalGross = 0;
    let totalDaily = 0;
    let totalBonusAllowances = 0;
    let totalSalaryAdvance = 0;
    let totalNet = 0;

    // ✅ New: totals per voluntary type + per expense name for TOTAL row
    const voluntaryTotals = new Map<string, number>();
    const expenseTotals = new Map<string, number>();

    const decryptedPayslips = payslips.map((p, index) => {
      const voluntary: Record<string, string | null> = {};
      const voluntaryDeductions = Array.isArray(p.voluntaryDeductions)
        ? p.voluntaryDeductions
        : [];

      for (const d of voluntaryDeductions) {
        const name = typeMap.get(d.typeId) || d.typeId;
        const amtNum = Number(d.amount ?? 0) || 0;

        voluntary[name] = formatNaira(d.amount, { blankZero: true });

        // ✅ accumulate totals for TOTAL row
        voluntaryTotals.set(name, (voluntaryTotals.get(name) || 0) + amtNum);
      }

      const expenseData = Array.isArray(p.expenses) ? p.expenses : [];
      const reimbursementsTotal = expenseData.reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0,
      );

      const expenses: Record<string, string | null> = {};
      for (const expense of expenseData) {
        const amtNum = Number(expense.amount ?? 0) || 0;
        expenses[expense.expenseName] = formatNaira(expense.amount, {
          blankZero: true,
        });

        // ✅ accumulate totals for TOTAL row
        expenseTotals.set(
          expense.expenseName,
          (expenseTotals.get(expense.expenseName) || 0) + amtNum,
        );
      }

      const grossRaw = p.gross_salary;
      const netRaw = p.net_salary;
      const salaryAdvanceRaw = p.salary_advance;
      const totalDeductionsRaw = p.total_deductions;
      const bonusesRaw = p.bonuses;

      const grossNum = Number(grossRaw ?? 0);
      const netNum = Number(netRaw ?? 0);
      const salaryAdvanceNum = Number(salaryAdvanceRaw ?? 0);

      totalGross += grossNum;
      totalNet += netNum;
      totalSalaryAdvance += salaryAdvanceNum;

      const payrollDate = p.issued_at
        ? new Date(p.issued_at)
        : new Date(`${p.payroll_month}-01`);
      const startDate = p.employment_start_date
        ? new Date(p.employment_start_date)
        : null;
      const workingDays = getWorkingDays(payrollDate, startDate);

      const dailyPayNum = workingDays > 0 ? grossNum / workingDays : 0;
      totalDaily += dailyPayNum;

      const totalDeductionsInclAdvanceNum =
        Number(totalDeductionsRaw ?? 0) + Number(salaryAdvanceRaw ?? 0);

      const bonusAllowancesTotalNum =
        Number(bonusesRaw ?? 0) + reimbursementsTotal;
      totalBonusAllowances += bonusAllowancesTotalNum;

      return {
        sn: index + 1,

        employee_number: p.employee_number,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        employee_name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        designation: p.designation ?? '',

        bank_name: p.bank_name ? decrypt(p.bank_name) : '',
        bank_account_number: p.bank_account_number
          ? decrypt(p.bank_account_number)
          : '',

        gross_salary: formatNaira(grossRaw, { blankZero: true }),
        net_salary: formatNaira(netRaw, { blankZero: true }),
        paye_tax: formatNaira(p.paye_tax, { blankZero: true }),
        pension_contribution: formatNaira(p.pension_contribution, {
          blankZero: true,
        }),
        employer_pension_contribution: formatNaira(
          p.employer_pension_contribution,
          { blankZero: true },
        ),
        nhf_contribution: formatNaira(p.nhf_contribution, { blankZero: true }),

        deductions_total: formatNaira(totalDeductionsInclAdvanceNum, {
          blankZero: true,
        }),
        bonus_allowances_total: formatNaira(bonusAllowancesTotalNum, {
          blankZero: true,
        }),

        salary_advance: formatNaira(salaryAdvanceRaw, { blankZero: true }),
        net_pay: formatNaira(netRaw, { blankZero: true }),

        working_days: workingDays,

        daily_pay: formatNaira(dailyPayNum, { blankZero: true }),
        gross_pay: formatNaira(grossNum, { blankZero: true }),

        ...expenses,
        ...voluntary,
      };
    });

    if (format === 'daily_schedule') {
      // Build totals object for voluntary columns
      const voluntaryTotalsRow: Record<string, string | null> = {};
      for (const [name, total] of voluntaryTotals.entries()) {
        voluntaryTotalsRow[name] = formatNaira(total, { blankZero: true });
      }

      // Build totals object for expense columns
      const expenseTotalsRow: Record<string, string | null> = {};
      for (const [name, total] of expenseTotals.entries()) {
        expenseTotalsRow[name] = formatNaira(total, { blankZero: true });
      }

      decryptedPayslips.push({
        sn: 0,

        employee_number: '',
        first_name: '',
        last_name: '',
        email: '',
        employee_name: 'TOTAL',
        designation: '',

        bank_name: '',
        bank_account_number: '',

        gross_salary: null,
        net_salary: null,
        paye_tax: null,
        pension_contribution: null,
        employer_pension_contribution: null,
        nhf_contribution: null,

        bonus_allowances_total: formatNaira(totalBonusAllowances, {
          blankZero: true,
        }),

        ...expenseTotalsRow,
        salary_advance: formatNaira(totalSalaryAdvance, { blankZero: true }),
        ...voluntaryTotalsRow,

        // This is still the authoritative deduction total in your schedule
        deductions_total: null,

        net_pay: formatNaira(totalNet),
        working_days: 0,
        daily_pay: formatNaira(totalDaily, { blankZero: true }),
        gross_pay: formatNaira(totalGross),
      });
    }

    const companyName = payslips[0]?.companyName || 'unknown-company';
    const companySlug = slugify(companyName);
    const filename = `${companySlug}-${format}-${payslips[0].payroll_month}`;

    const keys = columns.map((col) => ({ field: col.field, title: col.title }));

    return this.exportAndUploadExcel(
      decryptedPayslips,
      keys,
      filename,
      companyId,
      'payroll-payslips',
    );
  }

  async downloadYtdPayslipsToS3(
    companyId: string,
    format: 'csv' | 'excel' = 'csv',
  ) {
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

    if (!ytdData.length) {
      throw new BadRequestException('No YTD data found');
    }

    const filename = `ytd_summary_${companyId}_${new Date().toISOString().slice(0, 10)}`;
    const columns = [
      { field: 'employeeNumber', title: 'Employee Number' },
      { field: 'firstName', title: 'First Name' },
      { field: 'lastName', title: 'Last Name' },
      { field: 'gross_salary_ytd', title: 'YTD Gross Salary (₦)' },
      { field: 'net_salary_ytd', title: 'YTD Net Salary (₦)' },
      { field: 'paye_tax_ytd', title: 'YTD PAYE Tax (₦)' },
      { field: 'pension_contribution_ytd', title: 'YTD Employee Pension (₦)' },
      {
        field: 'employer_pension_contribution_ytd',
        title: 'YTD Employer Pension (₦)',
      },
      { field: 'nhf_contribution_ytd', title: 'YTD NHF (₦)' },
    ];

    if (format === 'csv') {
      return this.exportAndUpload(ytdData, columns, filename, companyId, 'ytd');
    } else {
      return this.exportAndUploadExcel(
        ytdData,
        columns,
        filename,
        companyId,
        'ytd',
      );
    }
  }

  private async generateCompanyVarianceMatrix(companyId: string) {
    const result =
      await this.payrollService.getEmployeePayrollVariance(companyId);
    if (!result || !('varianceList' in result)) {
      return {
        rows: [],
        columns: [],
        payrollDate: null,
        previousPayrollDate: null,
        empty: true, // <--- signal this is not a normal result
      };
    }

    const { payrollDate, previousPayrollDate, varianceList } = result;

    const total = {
      grossSalary: new Decimal(0),
      netSalary: new Decimal(0),
      paye: new Decimal(0),
      pension: new Decimal(0),
      nhf: new Decimal(0),
      employerPension: new Decimal(0),
      previous: {
        grossSalary: new Decimal(0),
        netSalary: new Decimal(0),
        paye: new Decimal(0),
        pension: new Decimal(0),
        nhf: new Decimal(0),
        employerPension: new Decimal(0),
      },
    };

    for (const v of varianceList) {
      total.previous.grossSalary = total.previous.grossSalary.plus(
        v.previous.grossSalary || 0,
      );
      total.previous.netSalary = total.previous.netSalary.plus(
        v.previous.netSalary || 0,
      );
      total.previous.paye = total.previous.paye.plus(v.previous.paye || 0);
      total.previous.pension = total.previous.pension.plus(
        v.previous.pension || 0,
      );
      total.previous.nhf = total.previous.nhf.plus(v.previous.nhf || 0);
      total.previous.employerPension = total.previous.employerPension.plus(
        v.previous.employerPension || 0,
      );

      total.grossSalary = total.grossSalary.plus(v.current.grossSalary || 0);
      total.netSalary = total.netSalary.plus(v.current.netSalary || 0);
      total.paye = total.paye.plus(v.current.paye || 0);
      total.pension = total.pension.plus(v.current.pension || 0);
      total.nhf = total.nhf.plus(v.current.nhf || 0);
      total.employerPension = total.employerPension.plus(
        v.current.employerPension || 0,
      );
    }

    const rows = [
      {
        metric: 'Gross Salary (₦)',
        [previousPayrollDate]: this.format(total.previous.grossSalary),
        [payrollDate]: this.format(total.grossSalary),
        variance: this.format(
          total.grossSalary.minus(total.previous.grossSalary),
        ),
      },
      {
        metric: 'Net Salary (₦)',
        [previousPayrollDate]: this.format(total.previous.netSalary),
        [payrollDate]: this.format(total.netSalary),
        variance: this.format(total.netSalary.minus(total.previous.netSalary)),
      },
      {
        metric: 'PAYE (₦)',
        [previousPayrollDate]: this.format(total.previous.paye),
        [payrollDate]: this.format(total.paye),
        variance: this.format(total.paye.minus(total.previous.paye)),
      },
      {
        metric: 'Pension (Employee) (₦)',
        [previousPayrollDate]: this.format(total.previous.pension),
        [payrollDate]: this.format(total.pension),
        variance: this.format(total.pension.minus(total.previous.pension)),
      },
      {
        metric: 'NHF Contribution (₦)',
        [previousPayrollDate]: this.format(total.previous.nhf),
        [payrollDate]: this.format(total.nhf),
        variance: this.format(total.nhf.minus(total.previous.nhf)),
      },
      {
        metric: 'Pension (Employer) (₦)',
        [previousPayrollDate]: this.format(total.previous.employerPension),
        [payrollDate]: this.format(total.employerPension),
        variance: this.format(
          total.employerPension.minus(total.previous.employerPension),
        ),
      },
    ];

    const columns = [
      { field: 'metric', title: 'Metric' },
      {
        field: previousPayrollDate,
        title: `Previous (${previousPayrollDate})`,
      },
      { field: payrollDate, title: `Current (${payrollDate})` },
      { field: 'variance', title: 'Variance (₦)' },
    ];

    return {
      payrollDate,
      previousPayrollDate,
      rows,
      columns,
    };
  }

  private async generateEmployeeVarianceMatrix(companyId: string) {
    const result =
      await this.payrollService.getEmployeePayrollVariance(companyId);
    if (!result || !('varianceList' in result)) {
      return {
        rows: [],
        columns: [],
        payrollDate: null,
        previousPayrollDate: null,
        empty: true, // <--- signal this is not a normal result
      };
    }

    const { payrollDate, previousPayrollDate, varianceList } = result;

    const rows: any[] = [];

    for (const v of varianceList) {
      const name = v.fullName;

      rows.push(
        {
          employee: name,
          metric: 'Gross Salary (₦)',
          [previousPayrollDate]: this.format(v.previous.grossSalary),
          [payrollDate]: this.format(v.current.grossSalary),
          variance: this.format(v.variance.grossSalaryDiff),
        },
        {
          employee: name,
          metric: 'Net Salary (₦)',
          [previousPayrollDate]: this.format(v.previous.netSalary),
          [payrollDate]: this.format(v.current.netSalary),
          variance: this.format(v.variance.netSalaryDiff),
        },
        {
          employee: name,
          metric: 'PAYE (₦)',
          [previousPayrollDate]: this.format(v.previous.paye),
          [payrollDate]: this.format(v.current.paye),
          variance: this.format(v.variance.payeDiff),
        },
        {
          employee: name,
          metric: 'Pension (₦)',
          [previousPayrollDate]: this.format(v.previous.pension),
          [payrollDate]: this.format(v.current.pension),
          variance: this.format(v.variance.pensionDiff),
        },
        {
          employee: name,
          metric: 'Employer Pension (₦)',
          [previousPayrollDate]: this.format(v.previous.employerPension),
          [payrollDate]: this.format(v.current.employerPension),
          variance: this.format(v.variance.employerPensionDiff),
        },
        {
          employee: name,
          metric: 'NHF (₦)',
          [previousPayrollDate]: this.format(v.previous.nhf),
          [payrollDate]: this.format(v.current.nhf ?? 0),
          variance: this.format(v.variance.nhfDiff),
        },
      );
    }

    const columns = [
      { field: 'employee', title: 'Employee' },
      { field: 'metric', title: 'Metric' },
      {
        field: previousPayrollDate,
        title: `Previous (${previousPayrollDate})`,
      },
      { field: payrollDate, title: `Current (${payrollDate})` },
      { field: 'variance', title: 'Variance (₦)' },
    ];

    return {
      payrollDate,
      previousPayrollDate,
      rows,
      columns,
    };
  }

  async getPayrollVarianceMatrices(companyId: string) {
    const [companyMatrix, employeeMatrix] = await Promise.all([
      this.generateCompanyVarianceMatrix(companyId),
      this.generateEmployeeVarianceMatrix(companyId),
    ]);

    return {
      company: companyMatrix,
      employees: employeeMatrix,
    };
  }

  async generateCompanyPayrollVarianceReportToS3(companyId: string) {
    const { rows, columns, payrollDate } =
      await this.generateCompanyVarianceMatrix(companyId);
    const filename = `payroll_summary_matrix_${companyId}_${payrollDate}`;
    return this.exportAndUploadMatrix(
      rows,
      columns,
      filename,
      companyId,
      'payroll-summary-matrix',
    );
  }

  async generateEmployeeMatrixVarianceReportToS3(companyId: string) {
    const result =
      await this.payrollService.getEmployeePayrollVariance(companyId);

    if (!result || !('varianceList' in result)) {
      throw new Error('No payroll variance data available.');
    }

    const { payrollDate, previousPayrollDate, varianceList } = result;

    const rows: any[] = [];

    for (const v of varianceList) {
      const name = v.fullName;

      rows.push(
        {
          employee: name,
          metric: 'Gross Salary (₦)',
          [previousPayrollDate]: this.format(v.previous.grossSalary),
          [payrollDate]: this.format(v.current.grossSalary),
          variance: this.format(v.variance.grossSalaryDiff),
        },
        {
          employee: name,
          metric: 'Net Salary (₦)',
          [previousPayrollDate]: this.format(v.previous.netSalary),
          [payrollDate]: this.format(v.current.netSalary),
          variance: this.format(v.variance.netSalaryDiff),
        },
        {
          employee: name,
          metric: 'PAYE (₦)',
          [previousPayrollDate]: this.format(v.previous.paye),
          [payrollDate]: this.format(v.current.paye),
          variance: this.format(v.variance.payeDiff),
        },
        {
          employee: name,
          metric: 'Pension (₦)',
          [previousPayrollDate]: this.format(v.previous.pension),
          [payrollDate]: this.format(v.current.pension),
          variance: this.format(v.variance.pensionDiff),
        },
        {
          employee: name,
          metric: 'Employer Pension (₦)',
          [previousPayrollDate]: this.format(v.previous.employerPension),
          [payrollDate]: this.format(v.current.employerPension),
          variance: this.format(v.variance.employerPensionDiff),
        },
        {
          employee: name,
          metric: 'NHF (₦)',
          [previousPayrollDate]: this.format(v.previous.nhf),
          [payrollDate]: this.format(v.current.nhf ?? 0),
          variance: this.format(v.variance.nhfDiff),
        },
      );
    }

    const filename = `employee_variance_matrix_${companyId}_${payrollDate}`;
    const columns = [
      { field: 'employee', title: 'Employee' },
      { field: 'metric', title: 'Metric' },
      {
        field: previousPayrollDate,
        title: `Previous (${previousPayrollDate})`,
      },
      { field: payrollDate, title: `Current (${payrollDate})` },
      { field: 'variance', title: 'Variance (₦)' },
    ];

    return this.exportAndUploadMatrix(
      rows,
      columns,
      filename,
      companyId,
      'payroll-employee-matrix',
    );
  }

  /** 1. Full payroll dashboard (all combined metrics) */
  async generatePayrollDashboardReportToS3(companyId: string) {
    const dashboard = await this.payrollService.getPayrollDashboard(companyId);

    // Flatten runSummaries for CSV
    const rows = dashboard.runSummaries.map((r) => ({
      payrollRunId: r.payrollRunId,
      payrollDate: r.payrollDate,
      payrollMonth: r.payrollMonth,
      approvalStatus: r.approvalStatus,
      paymentStatus: r.paymentStatus,
      totalGross: r.totalGross,
      totalDeductions: r.totalDeductions,
      totalBonuses: r.totalBonuses,
      totalNet: r.totalNet,
      employeeCount: r.employeeCount,
      costPerRun: r.costPerRun,
    }));

    const filename = `payroll_dashboard_${companyId}_${this.todayString()}`;

    const columns = [
      { field: 'payrollRunId', title: 'Payroll Run ID' },
      { field: 'payrollDate', title: 'Payroll Date' },
      { field: 'payrollMonth', title: 'Payroll Month' },
      { field: 'approvalStatus', title: 'Approval Status' },
      { field: 'paymentStatus', title: 'Payment Status' },
      { field: 'totalGross', title: 'Total Gross (₦)' },
      { field: 'totalDeductions', title: 'Total Deductions (₦)' },
      { field: 'totalBonuses', title: 'Total Bonuses (₦)' },
      { field: 'totalNet', title: 'Total Net Pay (₦)' },
      { field: 'employeeCount', title: 'Employee Count' },
      { field: 'costPerRun', title: 'Cost Per Run (₦)' },
    ];

    return this.exportAndUpload(
      rows,
      columns,
      filename,
      companyId,
      'payroll-dashboard',
    );
  }

  /** 2. Payroll run summaries (with optional month) */
  async generateRunSummariesReportToS3(companyId: string, month?: string) {
    const runs = await this.payrollService.getPayrollDashboard(
      companyId,
      month,
    );
    const runSummaries = runs.runSummaries;

    const rows = runSummaries.map((r) => ({
      payrollRunId: r.payrollRunId,
      payrollDate: r.payrollDate,
      payrollMonth: r.payrollMonth,
      approvalStatus: r.approvalStatus,
      paymentStatus: r.paymentStatus,
      totalGross: r.totalGross,
      totalDeductions: r.totalDeductions,
      totalBonuses: r.totalBonuses,
      totalNet: r.totalNet,
      employeeCount: r.employeeCount,
      costPerRun: r.costPerRun,
    }));

    const m = month ?? new Date().toISOString().slice(0, 7);
    const filename = `run_summaries_${companyId}_${m}`;

    const columns = [
      { field: 'payrollRunId', title: 'Payroll Run ID' },
      { field: 'payrollDate', title: 'Payroll Date' },
      { field: 'payrollMonth', title: 'Payroll Month' },
      { field: 'approvalStatus', title: 'Approval Status' },
      { field: 'paymentStatus', title: 'Payment Status' },
      { field: 'totalGross', title: 'Total Gross (₦)' },
      { field: 'totalDeductions', title: 'Total Deductions (₦)' },
      { field: 'totalBonuses', title: 'Total Bonuses (₦)' },
      { field: 'totalNet', title: 'Total Net Pay (₦)' },
      { field: 'employeeCount', title: 'Employee Count' },
      { field: 'costPerRun', title: 'Cost Per Run (₦)' },
    ];

    return this.exportAndUpload(rows, columns, filename, companyId, 'runs');
  }

  /** 3. Cost by Pay Group for a given month */
  async generateCostByPayGroupReportToS3(companyId: string, month: string) {
    const data = await this.payrollService.getCostByPayGroup(companyId, month);
    const rows = data.map((r) => ({
      payGroupId: r.payGroupId,
      payGroupName: r.payGroupName,
      totalGross: r.totalGross,
      totalNet: r.totalNet,
      headcount: r.headcount,
    }));
    const filename = `cost_by_paygroup_${companyId}_${month}`;
    const columns = [
      { field: 'payGroupId', title: 'Pay Group ID' },
      { field: 'payGroupName', title: 'Pay Group Name' },
      { field: 'totalGross', title: 'Total Gross (₦)' },
      { field: 'totalNet', title: 'Total Net (₦)' },
      { field: 'headcount', title: 'Employee Count' },
    ];
    return this.exportAndUpload(
      rows,
      columns,
      filename,
      companyId,
      'cost-by-paygroup',
    );
  }

  /** 4. Cost by Department for a given month */
  async generateCostByDepartmentReportToS3(
    companyId: string,
    month: string,
    format: 'csv' | 'excel' = 'csv',
  ) {
    const data = await this.payrollService.getCostByDepartment(
      companyId,
      month,
    );
    const rows = data.map((r) => ({
      departmentName: r.departmentName,
      totalGross: r.totalGross,
      totalNet: r.totalNet,
      headcount: r.headcount,
    }));
    const filename = `cost_by_department_${companyId}_${month}`;
    const columns = [
      { field: 'departmentName', title: 'Department Name' },
      { field: 'totalGross', title: 'Total Gross (₦)' },
      { field: 'totalNet', title: 'Total Net (₦)' },
      { field: 'headcount', title: 'Headcount' },
    ];

    if (format === 'excel') {
      return this.exportAndUploadExcel(
        rows,
        columns,
        filename,
        companyId,
        'cost-by-department',
      );
    } else {
      return this.exportAndUpload(
        rows,
        columns,
        filename,
        companyId,
        'cost-by-department',
      );
    }
  }

  /** 5. generate by Employee */
  async generateDeductionsByEmployeeReportToS3(
    companyId: string,
    month: string,
    format: 'csv' | 'excel' = 'csv',
  ) {
    const data = await this.payrollService.getDeductionsByEmployee(
      companyId,
      month,
    );

    const rows = data.map((r) => ({
      employeeName: r.employeeName,
      paye: this.formatNumber(r.paye),
      pension: this.formatNumber(r.pension),
      nhf: this.formatNumber(r.nhf ?? 0),
      salaryAdvance: this.formatNumber(r.salaryAdvance ?? 0),
      voluntary: this.formatNumber(r.voluntary),
      total: this.formatNumber(r.total),
    }));

    const filename = `deductions_by_employee_${companyId}_${month}`;

    const columns = [
      { field: 'employeeName', title: 'Employee Name' },
      { field: 'paye', title: 'PAYE' },
      { field: 'pension', title: 'Pension' },
      { field: 'nhf', title: 'NHF' },
      { field: 'salaryAdvance', title: 'Salary Advance' },
      { field: 'voluntary', title: 'Voluntary' },
      { field: 'total', title: 'Total Deductions' },
    ];

    if (format === 'excel') {
      return this.exportAndUploadExcel(
        rows,
        columns,
        filename,
        companyId,
        'deductions-by-employee',
      );
    } else {
      return this.exportAndUpload(
        rows,
        columns,
        filename,
        companyId,
        'deductions-by-employee',
      );
    }
  }

  /** 6. Top bonus recipients for a given month */
  async generateTopBonusRecipientsReportToS3(
    companyId: string,
    month: string,
    limit = 10,
  ) {
    const data = await this.payrollService.getTopBonusRecipients(
      companyId,
      month,
      limit,
    );
    const rows = data.map((r) => ({
      employeeId: r.employeeId,
      fullName: r.fullName,
      bonus: r.bonus,
    }));
    const filename = `top_bonus_${companyId}_${month}`;
    const columns = [
      { field: 'employeeId', title: 'Employee ID' },
      { field: 'fullName', title: 'Full Name' },
      { field: 'bonus', title: 'Bonus (₦)' },
    ];
    return this.exportAndUpload(
      rows,
      columns,
      filename,
      companyId,
      'bonus-recipients',
    );
  }

  // 7. Generate Loan Summary Report from Payroll */
  async generateLoanSummaryReportToS3(companyId: string) {
    const { outstandingSummary, monthlySummary } =
      await this.payrollService.getLoanFullReport(companyId);

    const outstandingRows = outstandingSummary.map((item) => ({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      totalLoanAmount: item.totalLoanAmount,
      totalRepaid: item.totalRepaid,
      outstanding: item.outstanding,
      status: item.status,
    }));

    const outstandingColumns = [
      { field: 'employeeId', title: 'Employee ID' },
      { field: 'employeeName', title: 'Employee Name' },
      { field: 'totalLoanAmount', title: 'Total Loan Amount' },
      { field: 'totalRepaid', title: 'Total Repaid' },
      { field: 'outstanding', title: 'Outstanding Balance' },
      { field: 'status', title: 'Status' },
    ];

    const monthlyRows = monthlySummary.map((item) => ({
      year: item.year,
      month: item.month,
      status: item.status,
      totalLoanAmount: item.totalLoanAmount,
      totalRepaid: item.totalRepaid,
      totalOutstanding: item.totalOutstanding,
    }));

    const monthlyColumns = [
      { field: 'year', title: 'Year' },
      { field: 'month', title: 'Month' },
      { field: 'status', title: 'Status' },
      { field: 'totalLoanAmount', title: 'Total Loan Amount' },
      { field: 'totalRepaid', title: 'Total Repaid' },
      { field: 'totalOutstanding', title: 'Total Outstanding' },
    ];

    // Create multi-sheet export
    const filePath = await ExportUtil.exportToExcelMultipleSheets(
      [
        {
          sheetName: 'Outstanding Summary',
          rows: outstandingRows,
          columns: outstandingColumns,
        },
        {
          sheetName: 'Monthly Summary',
          rows: monthlyRows,
          columns: monthlyColumns,
        },
      ],
      `loan_summary_${companyId}_${new Date().toISOString().slice(0, 10)}`,
    );

    // Upload to S3
    return this.awsService.uploadFilePath(
      filePath,
      companyId,
      'report',
      'loan-summary',
    );
  }

  async generateLoanRepaymentReportToS3(
    companyId: string,
    format: 'csv' | 'excel' = 'csv',
    month?: string,
  ) {
    // 1. Fetch the full data
    const allData = await this.payrollService.getLoanRepaymentReport(companyId);

    // 2. Apply month filter if provided
    let filteredData = allData;

    if (month && month !== 'all') {
      // Convert month string (e.g. "2025-06") to year/month for comparison
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);

      filteredData = allData.filter((r) => {
        const repaymentDate = new Date(r.lastRepayment);
        return (
          repaymentDate.getFullYear() === year &&
          repaymentDate.getMonth() + 1 === monthNum
        );
      });
    }

    // 3. Prepare rows for export
    const rows = filteredData.map((r) => ({
      employeeName: r.employeeName,
      totalRepaid: r.totalRepaid,
      repaymentCount: r.repaymentCount,
      firstRepayment: r.firstRepayment,
      lastRepayment: r.lastRepayment,
    }));

    // 4. Define export columns
    const columns = [
      { field: 'employeeName', title: 'Employee Name' },
      { field: 'totalRepaid', title: 'Total Repaid (₦)' },
      { field: 'repaymentCount', title: 'Repayment Count' },
      { field: 'firstRepayment', title: 'First Repayment Date' },
      { field: 'lastRepayment', title: 'Last Repayment Date' },
    ];

    // 5. File name convention (include month if provided)
    const filename = month
      ? `loan_repayment_report_${companyId}_${month}`
      : `loan_repayment_report_${companyId}_${new Date().toISOString().split('T')[0]}`;

    // 6. Export and upload to S3
    if (format === 'excel') {
      return this.exportAndUploadExcel(
        rows,
        columns,
        filename,
        companyId,
        'loan-repayment',
      );
    } else {
      return this.exportAndUpload(
        rows,
        columns,
        filename,
        companyId,
        'loan-repayment',
      );
    }
  }

  // 8. Generate GL summary from payroll */
  async generateGLSummaryFromPayroll(companyId: string, month: string) {
    // Step 1: Fetch payrolls
    const payrolls = await this.db
      .select({
        payrollId: payroll.id,
        payrollRunId: payroll.payrollRunId,
        payrollMonth: payroll.payrollMonth,
        basic: payroll.basic,
        housing: payroll.housing,
        transport: payroll.transport,
        netSalary: payroll.netSalary,
        payeTax: payroll.payeTax,
        pension: payroll.pensionContribution,
        employerPension: payroll.employerPensionContribution,
        nhf: payroll.nhfContribution,
        voluntaryDeductions: payroll.voluntaryDeductions,
        salaryAdvance: payroll.salaryAdvance,
        expenses: payroll.reimbursements, // Assuming payroll has expenses as a field
      })
      .from(payroll)
      .where(
        and(eq(payroll.companyId, companyId), eq(payroll.payrollMonth, month)),
      );

    const deductionTypesData = await this.db
      .select({
        id: deductionTypes.id,
        name: deductionTypes.name,
      })
      .from(deductionTypes);

    const deductionTypeMap = new Map(
      deductionTypesData.map((d) => [d.id, d.name]),
    );

    if (!payrolls.length) {
      return {
        rows: [],
        columns: [],
        empty: true,
      };
    }

    const payrollRunIds = payrolls.map((p) => p.payrollRunId);

    // Step 2: Fetch dynamic allowances
    const allowances = await this.db
      .select({
        payrollId: payrollAllowances.payrollId,
        title: payrollAllowances.allowance_type,
        amount: payrollAllowances.allowanceAmount,
      })
      .from(payrollAllowances)
      .where(inArray(payrollAllowances.payrollId, payrollRunIds));

    // Step 3: GL grouping
    const grouped = new Map<
      string,
      {
        glCode: string;
        label: string;
        yearMonth: string;
        debit: Decimal;
        credit: Decimal;
      }
    >();

    // Step 4: Base salary components
    for (const row of payrolls) {
      const ym = row.payrollMonth;

      const components = [
        { field: 'basic', label: 'Basic Salary', glCode: '5000' },
        { field: 'housing', label: 'Housing Allowance', glCode: '5001' },
        { field: 'transport', label: 'Transport Allowance', glCode: '5002' },
      ];

      for (const comp of components) {
        const amount = new Decimal(row[comp.field] || 0);
        const key = `${comp.glCode}__${ym}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            glCode: comp.glCode,
            label: comp.label,
            yearMonth: ym,
            debit: new Decimal(0),
            credit: new Decimal(0),
          });
        }

        grouped.get(key)!.debit = grouped.get(key)!.debit.plus(amount);
      }

      const voluntaryDeductions = Array.isArray(row.voluntaryDeductions)
        ? row.voluntaryDeductions
        : [];

      for (const d of voluntaryDeductions) {
        const amount = new Decimal(d.amount || 0);
        const typeName =
          deductionTypeMap.get(d.typeId) || 'Voluntary Deduction';
        const label = `${typeName} (Voluntary Deduction)`;
        const glCode = '2400'; // You can assign a consistent GL code
        const key = `${glCode}_${label}__${ym}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            glCode,
            label,
            yearMonth: ym,
            debit: new Decimal(0),
            credit: new Decimal(0),
          });
        }

        grouped.get(key)!.credit = grouped.get(key)!.credit.plus(amount);
      }

      const advanceAmt = new Decimal(row.salaryAdvance || 0);
      if (advanceAmt.gt(0)) {
        const advGl = '2405'; // pick your GL code for advances
        const advLabel = 'Salary Advance';
        const advKey = `${advGl}__${ym}`;

        if (!grouped.has(advKey)) {
          grouped.set(advKey, {
            glCode: advGl,
            label: advLabel,
            yearMonth: ym,
            debit: new Decimal(0),
            credit: new Decimal(0),
          });
        }
        grouped.get(advKey)!.credit = grouped
          .get(advKey)!
          .credit.plus(advanceAmt);
      }

      // Deductions
      const deductions = [
        { field: 'payeTax', glCode: '2100', label: 'PAYE' },
        { field: 'pension', glCode: '2200', label: 'Pension' },
        { field: 'employerPension', glCode: '2210', label: 'Employer Pension' },
        { field: 'nhf', glCode: '2300', label: 'NHF' },
      ];

      for (const d of deductions) {
        const amount = new Decimal(row[d.field] || 0);
        const key = `${d.glCode}__${ym}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            glCode: d.glCode,
            label: d.label,
            yearMonth: ym,
            debit: new Decimal(0),
            credit: new Decimal(0),
          });
        }

        grouped.get(key)!.credit = grouped.get(key)!.credit.plus(amount);

        if (d.field === 'employerPension') {
          const balanceKey = `2211__${ym}`; // Different GL code for Balance Sheet version
          const balanceLabel = 'Employer Pension (Balance Sheet)';

          if (!grouped.has(balanceKey)) {
            grouped.set(balanceKey, {
              glCode: '2211',
              label: balanceLabel,
              yearMonth: ym,
              debit: new Decimal(0),
              credit: new Decimal(0),
            });
          }
          grouped.get(balanceKey)!.debit = grouped
            .get(balanceKey)!
            .debit.plus(amount);
        }
      }

      // Net salary as credit (cash/bank/payroll control)
      const netAmount = new Decimal(row.netSalary || 0);
      const netKey = `3000__${ym}`;
      if (!grouped.has(netKey)) {
        grouped.set(netKey, {
          glCode: '3000',
          label: 'Net Salary',
          yearMonth: ym,
          debit: new Decimal(0),
          credit: new Decimal(0),
        });
      }
      grouped.get(netKey)!.credit = grouped.get(netKey)!.credit.plus(netAmount);
    }

    // Step 5: Dynamic allowances
    for (const allowance of allowances) {
      const payrollRow = payrolls.find(
        (p) => p.payrollRunId === allowance.payrollId,
      );
      if (!payrollRow) continue;

      const ym = payrollRow.payrollMonth;
      const label = `${allowance.title} Allowance`;
      const glCode = '5003';
      const key = `${glCode}_${label}__${ym}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          glCode,
          label,
          yearMonth: ym,
          debit: new Decimal(0),
          credit: new Decimal(0),
        });
      }

      grouped.get(key)!.debit = grouped
        .get(key)!
        .debit.plus(new Decimal(allowance.amount || 0));
    }

    for (const row of payrolls) {
      const ym = row.payrollMonth;

      // Step: Process each reimbursement (expense) individually
      const expenses = Array.isArray(row.expenses) ? row.expenses : [];

      for (const expense of expenses) {
        const expenseAmount = new Decimal(expense.amount || 0);

        // GL code for expenses (could be something like '3005' or any custom code)
        const expenseGlCode = '3005'; // GL code for reimbursements
        const expenseLabel = `${expense.expenseName} Reimbursement`;
        const expenseKey = `${expenseGlCode}__${expense.expenseName}__${ym}`;

        // Add a new entry to the GL for each individual expense
        if (!grouped.has(expenseKey)) {
          grouped.set(expenseKey, {
            glCode: expenseGlCode,
            label: expenseLabel,
            yearMonth: ym,
            debit: new Decimal(0),
            credit: new Decimal(0),
          });
        }

        // Add the expense amount to the credit side
        grouped.get(expenseKey)!.debit = grouped
          .get(expenseKey)!
          .debit.plus(expenseAmount);
      }
    }

    // Step 6: Format output + totals
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    const allEntries = Array.from(grouped.values());

    // Sort entries into desired sections
    const earnings = allEntries.filter(
      (entry) =>
        ['Basic Salary', 'Housing Allowance', 'Transport Allowance'].includes(
          entry.label,
        ) || entry.glCode === '5003', // dynamic allowance
    );

    const deductions = allEntries.filter(
      (entry) =>
        ['PAYE', 'Pension', 'Employer Pension', 'NHF'].includes(entry.label) ||
        entry.label.includes('(Voluntary Deduction)'),
    );

    const netAndOthers = allEntries.filter(
      (entry) => !earnings.includes(entry) && !deductions.includes(entry),
    );

    // Merge in preferred order
    const orderedEntries = [...earnings, ...deductions, ...netAndOthers];

    const rows = orderedEntries.map((entry) => {
      totalDebit = totalDebit.plus(entry.debit);
      totalCredit = totalCredit.plus(entry.credit);

      return {
        glAccountCode: entry.glCode,
        yearMonth: entry.yearMonth,
        label: entry.label,
        debit: entry.debit.gt(0) ? this.format(entry.debit) : '-', // replace 0 with '-'
        credit: entry.credit.gt(0) ? this.format(entry.credit) : '-', // replace 0 with '-'
      };
    });

    // Append total row
    rows.push({
      glAccountCode: '',
      yearMonth: '',
      label: 'Total',
      debit: this.format(totalDebit),
      credit: this.format(totalCredit),
    });

    const columns = [
      { field: 'glAccountCode', title: 'GL Code' },
      { field: 'yearMonth', title: 'Year-Month' },
      { field: 'label', title: 'Account Description' },
      { field: 'debit', title: 'Debit (₦)' },
      { field: 'credit', title: 'Credit (₦)' },
    ];

    return {
      rows,
      columns,
    };
  }

  async generateGLSummaryFromPayrollToS3(companyId: string, month: string) {
    const res = await this.generateGLSummaryFromPayroll(companyId, month);
    const filename = `gl_summary_${companyId}_${month}`;

    return this.exportAndUploadMatrix(
      res.rows,
      res.columns,
      filename,
      companyId,
      'payroll-gl-summary',
    );
  }
}
