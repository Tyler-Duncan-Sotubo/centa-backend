import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import pMap from 'p-map';
import {
  approvalSteps,
  approvalWorkflows,
  companies,
  companyRoles,
  employees,
  users,
} from 'src/drizzle/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, HOT_QUERIES } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { payrollAllowances } from '../schema/payroll-allowances.schema';
import { payrollYtd } from '../schema/payroll-ytd.schema';
import { v4 as uuidv4 } from 'uuid';
import { payroll, payrollApprovals } from '../schema/payroll-run.schema';
import { PayrollSettingsService } from '../settings/payroll-settings.service';
import { CompensationService } from 'src/modules/core/employees/compensation/compensation.service';
import { User } from 'src/common/types/user.type';
import { format } from 'date-fns';
import { TaxService } from '../tax/tax.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PayslipService } from '../payslip/payslip.service';
import { paySlips } from '../schema/payslip.schema';
import { countWorkingDays } from 'src/utils/workingDays.utils';
import { SalaryAdvanceService } from '../salary-advance/salary-advance.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import Decimal from 'decimal.js';
import { salaryAdvance } from '../salary-advance/schema/salary-advance.schema';
import { expenses } from 'src/modules/expenses/schema/expense.schema';
import { PayrollApprovalEmailService } from 'src/modules/notification/services/payroll-approval.service';
import { ConfigService } from '@nestjs/config';
import { HotQueries } from 'src/drizzle/hot-queries';

const D_ZERO = new Decimal(0);

const D_RATE_007 = new Decimal(0.07);
const D_RATE_011 = new Decimal(0.11);
const D_RATE_015 = new Decimal(0.15);
const D_RATE_019 = new Decimal(0.19);
const D_RATE_021 = new Decimal(0.21);
const D_RATE_024 = new Decimal(0.24);
const D_HUNDRED = new Decimal(100);

const toDec = (v: Decimal.Value): Decimal =>
  v instanceof Decimal ? v : new Decimal(v);

const BRACKETS = [
  { limit: new Decimal(300_000), rate: D_RATE_007 },
  { limit: new Decimal(600_000), rate: D_RATE_011 },
  { limit: new Decimal(1_100_000), rate: D_RATE_015 },
  { limit: new Decimal(1_600_000), rate: D_RATE_019 },
  { limit: new Decimal(3_200_000), rate: D_RATE_021 },
  { limit: new Decimal(Infinity), rate: D_RATE_024 },
] as const;

type HotRunCache = {
  deductionsByEmp: Map<string, any[]>;
  bonusesByEmp: Map<string, any[]>;
  adjustmentsByEmp: Map<string, any[]>;
  expensesByEmp: Map<string, any[]>;
  payGroupById: Map<string, any>;
  groupAllowByPg: Map<string, any[]>;
};

@Injectable()
export class RunService {
  constructor(
    @InjectQueue('payrollQueue') private payrollQueue: Queue,
    @Inject(DRIZZLE) private readonly db: db,
    @Inject(HOT_QUERIES) private readonly hot: HotQueries,
    private readonly auditService: AuditService,
    private readonly payrollSettingsService: PayrollSettingsService,
    private readonly compensationService: CompensationService,
    private readonly taxService: TaxService,
    private readonly payslipService: PayslipService,
    private readonly salaryAdvanceService: SalaryAdvanceService,
    private readonly pusher: PusherService,
    private readonly payrollApprovalEmailService: PayrollApprovalEmailService,
    private readonly configService: ConfigService,
  ) {}

  private calculatePAYE(
    annualSalary: Decimal.Value,
    pensionDeduction: Decimal.Value,
    nhfDeduction: Decimal.Value,
    taxRelief: Decimal.Value,
  ): { paye: Decimal; taxableIncome: Decimal } {
    // Convert once
    const annual = new Decimal(annualSalary);
    const pension = new Decimal(pensionDeduction).mul(12);
    const nhf = new Decimal(nhfDeduction).mul(12);
    const relief = new Decimal(taxRelief);

    // Redefined salary after deductions
    const redefinedAnnualSalary = annual.minus(pension).minus(nhf);

    // Personal allowance: ₦200,000 + 20% of redefined salary
    const personalAllowance = relief.plus(redefinedAnnualSalary.mul(0.2));

    // Taxable Income: salary - personal allowance - pension - nhf
    const taxableIncome = Decimal.max(
      annual.minus(personalAllowance).minus(pension).minus(nhf),
      D_ZERO,
    );

    // Compute PAYE using hoisted brackets (no per-call allocations)
    let paye = D_ZERO;
    let remaining = taxableIncome; // already a Decimal
    let previousLimit = D_ZERO;

    for (let i = 0; i < BRACKETS.length && remaining.gt(D_ZERO); i++) {
      const { limit, rate } = BRACKETS[i];
      const span = limit.minus(previousLimit);
      const range = remaining.lt(span) ? remaining : span; // Decimal.min without extra alloc
      if (range.lte(D_ZERO)) break;

      paye = paye.plus(range.mul(rate));
      remaining = remaining.minus(range);
      previousLimit = limit;
    }

    return {
      paye: paye.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      taxableIncome: taxableIncome.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    };
  }

  private percentOf(base: Decimal.Value, pct: Decimal.Value): Decimal {
    return toDec(base)
      .mul(toDec(pct))
      .div(D_HUNDRED)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  private round2(value: Decimal.Value): number {
    return Number(
      toDec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
    );
  }

  async calculatePayroll(
    employeeId: string,
    payrollDate: string,
    payrollRunId: string,
    companyId: string,
    userId: string,
    workflowId: string,
  ) {
    const payrollMonth = format(payrollDate, 'yyyy-MM');

    // 1) Fetch employee & date range
    const employee = await this.compensationService.findAll(employeeId);

    const payrollStart = new Date(`${payrollMonth}-01T00:00:00Z`);
    const startDate = payrollStart;
    const endDate = new Date(payrollStart);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const startISO = startDate.toISOString().slice(0, 10);
    const endISO = endDate.toISOString().slice(0, 10);

    const isStarter =
      new Date(employee.startDate) >= startDate &&
      new Date(employee.startDate) <= endDate;

    // 2) Parallel fetch — switched to HotQueries for the hot reads
    const [
      unpaidAdvance,
      activeDeductions,
      bonuses,
      payGroupRow,
      payrollSettings,
      groupRows,
      adjustments,
      activeExpenses,
    ] = await Promise.all([
      // keep service if it already optimizes internally
      this.salaryAdvanceService.getUnpaidAdvanceDeductions(employee.employeeId),

      // HOT: employee deductions active around a date
      this.hot.activeDeductions(employeeId, payrollDate),

      // HOT: bonuses by month range
      this.hot.bonusesByRange(employeeId, startISO, endISO),

      // HOT: pay group by id
      this.hot.payGroupById(employee.payGroupId!),

      // unchanged (likely cached in your service)
      this.payrollSettingsService.getAllPayrollSettings(companyId),

      // HOT: group allowances
      this.hot.groupAllowances(employee.payGroupId!),

      // HOT: adjustments exactly on payrollDate
      this.hot.adjustmentsByDate(companyId, employeeId, payrollDate),

      // HOT: expenses in range
      this.hot.expensesByRange(employeeId, startISO, endISO),
    ]);

    const unpaidAdvanceAmount = toDec(
      unpaidAdvance?.[0]?.monthlyDeduction || 0,
    );

    // Split by taxability
    const taxableAdjustments = adjustments.filter((a) => a.taxable);
    const nonTaxableAdjustments = adjustments.filter((a) => !a.taxable);

    const D_ZERO = new Decimal(0);
    const D_HUNDRED = new Decimal(100);

    const totalTaxableAdjustments = taxableAdjustments.reduce(
      (sum, a) => sum.plus(a.amount || 0),
      D_ZERO,
    );

    const totalBonuses = (bonuses || []).reduce(
      (sum, b) => sum.plus(b.amount || 0),
      D_ZERO,
    );

    // 3) Gross salary (monthly)
    let grossPay = toDec(employee.grossSalary).div(12);

    // 3a) Proration
    if (payrollSettings.enable_proration && isStarter) {
      const joinDate = new Date(employee.startDate);
      const leaveDate = employee.endDate ? new Date(employee.endDate) : null;

      let fromDate = startDate;
      if (joinDate >= startDate && joinDate <= endDate) fromDate = joinDate;

      let toDate = endDate;
      if (leaveDate && leaveDate >= startDate && leaveDate <= endDate) {
        toDate = leaveDate;
      }

      const countDays = (d1: Date, d2: Date) => {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const utc1 = Date.UTC(
          d1.getUTCFullYear(),
          d1.getUTCMonth(),
          d1.getUTCDate(),
        );
        const utc2 = Date.UTC(
          d2.getUTCFullYear(),
          d2.getUTCMonth(),
          d2.getUTCDate(),
        );
        return Math.round((utc2 - utc1) / MS_PER_DAY) + 1;
      };

      let daysInPeriod: number;
      let daysWorked: number;

      if (payrollSettings.proration_method === 'working_days') {
        daysInPeriod = countWorkingDays(startDate, endDate);
        daysWorked = countWorkingDays(fromDate, toDate);
      } else {
        daysInPeriod = countDays(startDate, endDate);
        daysWorked = countDays(fromDate, toDate);
      }

      grossPay = grossPay.mul(toDec(daysWorked).div(daysInPeriod));
    }

    const grossSalary = grossPay
      .plus(totalBonuses)
      .plus(totalTaxableAdjustments);

    // 4–13) Allowances & BHT
    const globalAllowances = (payrollSettings.allowance_others ?? []) as Array<{
      type: string;
      percentage?: number;
      fixedAmount?: number;
    }>;

    const globalRows = globalAllowances.map((a) => ({
      type: a.type,
      valueType: a.fixedAmount != null ? 'fixed' : ('percentage' as const),
      pct: a.percentage != null ? a.percentage : 0,
      fixed: a.fixedAmount != null ? a.fixedAmount : 0,
    }));

    const merged = [
      ...groupRows,
      ...globalRows.filter((g) => !groupRows.some((gr) => gr.type === g.type)),
    ];

    const basicPct = payrollSettings.basic_percent ?? 50;
    const housingPct = payrollSettings.housing_percent ?? 30;
    const transportPct = payrollSettings.transport_percent ?? 20;

    const pctAllowTotal = merged
      .filter((a) => a.valueType === 'percentage')
      .reduce((sum, a) => sum + Number(a.pct), 0);
    const bhtPctTotal = basicPct + housingPct + transportPct;

    if (bhtPctTotal + pctAllowTotal > 100) {
      throw new BadRequestException(
        `BHT% (${bhtPctTotal}%) + allowance% (${pctAllowTotal}%) exceed 100%.`,
      );
    }

    const fixedAllowances = merged
      .filter((a) => a.valueType === 'fixed')
      .map((a) => ({ type: a.type, fixed: Number(a.fixed) }));

    const fixedSum = fixedAllowances.reduce(
      (sum, a) => sum.plus(a.fixed),
      D_ZERO,
    );

    if (fixedSum.gt(grossSalary)) {
      throw new BadRequestException(
        `Fixed allowances (₦${(fixedSum.toNumber() / 100).toFixed(
          2,
        )}) exceed gross salary (₦${(grossSalary.toNumber() / 100).toFixed(
          2,
        )}).`,
      );
    }

    const budget = grossSalary.minus(fixedSum);

    const percentOf = (base: Decimal, pct: number | Decimal) =>
      new Decimal(base)
        .mul(pct)
        .div(100)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    let basicAmt = percentOf(budget, basicPct);
    const housingAmt = percentOf(budget, housingPct);
    const transportAmt = percentOf(budget, transportPct);

    const pctAllowances = merged
      .filter((a) => a.valueType === 'percentage')
      .map((a) => ({
        type: a.type,
        amount: toDec(a.pct ?? 0)
          .div(D_HUNDRED)
          .mul(budget)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      }));

    merged.sort((a, b) => a.type.localeCompare(b.type));

    const payrollAllowancesData = [
      ...fixedAllowances.map((a) => ({
        allowanceType: a.type,
        allowanceAmount: a.fixed,
      })),
      ...pctAllowances.map((a) => ({
        allowanceType: a.type,
        allowanceAmount: a.amount,
      })),
    ];

    const sumBHT = basicAmt.plus(housingAmt).plus(transportAmt);
    const sumPct = pctAllowances.reduce((s, a) => s.plus(a.amount), D_ZERO);
    const totalUsed = sumBHT.plus(sumPct).plus(fixedSum);
    const diff = grossSalary.minus(totalUsed);
    basicAmt = basicAmt.plus(diff);

    // 14) Statutory + PAYE
    const payGroupSettings = payGroupRow || {};
    const relief = payrollSettings.default_tax_relief ?? 200000;

    const bhtTotal = basicAmt.plus(housingAmt).plus(transportAmt);

    const empPct = toDec(payrollSettings.default_pension_employee_percent || 8);
    const erPct = toDec(payrollSettings.default_pension_employer_percent || 10);
    const nhfPct = toDec(payrollSettings.nhf_percent || 2.5);

    const applyPension = Boolean(
      payGroupSettings.applyPension ?? payrollSettings.apply_pension ?? false,
    );

    const applyNHF = Boolean(
      (payGroupSettings.applyNhf ?? payrollSettings.apply_nhf ?? false) &&
        employee.applyNhf,
    );

    const employeePensionContribution = applyPension
      ? percentOf(bhtTotal, empPct)
      : D_ZERO;

    const employerPensionContribution = applyPension
      ? percentOf(bhtTotal, erPct)
      : D_ZERO;

    const nhfContribution = applyNHF ? percentOf(basicAmt, nhfPct) : D_ZERO;

    const annualizedGross = grossSalary.mul(12);

    const { paye, taxableIncome } = this.calculatePAYE(
      annualizedGross,
      employeePensionContribution,
      nhfContribution,
      toDec(relief),
    );

    const monthlyPAYE = toDec(paye)
      .div(12)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const monthlyTaxableIncome = toDec(taxableIncome)
      .div(12)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    // Custom & non-taxable
    const deductionBreakdown: { typeId: string; amount: string }[] = [];

    const totalPostTaxDeductions = (activeDeductions || []).reduce(
      (sum, deduction) => {
        const value =
          deduction.rateType === 'percentage'
            ? grossSalary.mul(toDec(deduction.rateValue)).div(D_HUNDRED)
            : toDec(deduction.rateValue);

        deductionBreakdown.push({
          typeId: deduction.deductionTypeId,
          amount: value.toFixed(2),
        });

        return sum.plus(value);
      },
      D_ZERO,
    );

    const totalNonTaxable = nonTaxableAdjustments.reduce(
      (sum, a) => sum.plus(a.amount || 0),
      D_ZERO,
    );

    const reimbursedTotal = activeExpenses.reduce(
      (sum, expense) => sum.plus(toDec(expense.amount || 0)),
      D_ZERO,
    );

    const reimbursedExpenses = activeExpenses.map((expense) => ({
      id: expense.id,
      expenseName: expense.category,
      amount: toDec(expense.amount || 0).toFixed(2),
    }));

    const totalDeductions = monthlyPAYE
      .plus(employeePensionContribution)
      .plus(nhfContribution)
      .plus(totalPostTaxDeductions);

    const netSalary = Decimal.max(
      grossSalary
        .plus(totalNonTaxable)
        .plus(reimbursedTotal)
        .minus(unpaidAdvanceAmount)
        .minus(totalDeductions),
      D_ZERO,
    ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    // ---------- UPSERT + minimal deletes (allowances only) ----------
    const savedPayroll = await this.db.transaction(async (trx) => {
      const multi = payrollSettings.multi_level_approval;
      const approvalStatus = multi ? 'pending' : 'approved';
      const approvalDate = multi ? null : new Date().toISOString();
      const approvalRemarks = multi ? null : 'Auto-approved';

      const [inserted] = await trx
        .insert(payroll)
        .values({
          payrollRunId,
          employeeId,
          companyId,
          basic: basicAmt.toFixed(2),
          housing: housingAmt.toFixed(2),
          transport: transportAmt.toFixed(2),
          grossSalary: grossSalary.toFixed(2),
          pensionContribution: employeePensionContribution.toFixed(2),
          employerPensionContribution: employerPensionContribution.toFixed(2),
          bonuses: totalBonuses.toFixed(2),
          nhfContribution: nhfContribution.toFixed(2),
          payeTax: monthlyPAYE.toFixed(2),
          voluntaryDeductions: deductionBreakdown,
          totalDeductions: totalDeductions.toFixed(2),
          taxableIncome: monthlyTaxableIncome.toFixed(2),
          netSalary: netSalary.toFixed(2),
          salaryAdvance: unpaidAdvanceAmount.toFixed(2),
          reimbursements: reimbursedExpenses,
          payrollDate,
          payrollMonth,
          approvalStatus,
          approvalDate,
          approvalRemarks,
          requestedBy: userId,
          workflowId,
          currentStep: multi ? 0 : 1,
          isStarter: !!isStarter,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [payroll.employeeId, payroll.payrollDate, payroll.companyId],
          set: {
            payrollRunId: sql`EXCLUDED.payroll_run_id`,
            basic: sql`EXCLUDED.basic`,
            housing: sql`EXCLUDED.housing`,
            transport: sql`EXCLUDED.transport`,
            grossSalary: sql`EXCLUDED.gross_salary`,
            pensionContribution: sql`EXCLUDED.pension_contribution`,
            employerPensionContribution: sql`EXCLUDED.employer_pension_contribution`,
            bonuses: sql`EXCLUDED.bonuses`,
            nhfContribution: sql`EXCLUDED.nhf_contribution`,
            payeTax: sql`EXCLUDED.paye_tax`,
            voluntaryDeductions: sql`EXCLUDED.voluntary_deductions`,
            totalDeductions: sql`EXCLUDED.total_deductions`,
            taxableIncome: sql`EXCLUDED.taxable_income`,
            netSalary: sql`EXCLUDED.net_salary`,
            salaryAdvance: sql`EXCLUDED.salary_advance`,
            reimbursements: sql`EXCLUDED.reimbursements`,
            approvalStatus: sql`EXCLUDED.approval_status`,
            approvalDate: sql`EXCLUDED.approval_date`,
            approvalRemarks: sql`EXCLUDED.approval_remarks`,
            requestedBy: sql`EXCLUDED.requested_by`,
            workflowId: sql`EXCLUDED.workflow_id`,
            currentStep: sql`EXCLUDED.current_step`,
            isStarter: sql`EXCLUDED.is_starter`,
            updatedAt: sql`now()`,
            payrollMonth: sql`EXCLUDED.payroll_month`,
          },
        })
        .returning()
        .execute();

      // YTD refresh (can also upsert if you add a unique)
      await trx
        .delete(payrollYtd)
        .where(
          and(
            eq(payrollYtd.employeeId, employeeId),
            eq(payrollYtd.payrollDate, payrollDate),
            eq(payrollYtd.companyId, companyId),
          ),
        )
        .execute();

      await trx
        .insert(payrollYtd)
        .values({
          employeeId,
          payrollMonth,
          payrollDate,
          payrollId: inserted.id,
          companyId,
          year: new Date().getFullYear(),
          grossSalary: grossSalary.toFixed(2),
          netSalary: netSalary.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          bonuses: totalBonuses.toFixed(2),
          PAYE: monthlyPAYE.toFixed(2),
          pension: employeePensionContribution.toFixed(2),
          employerPension: employerPensionContribution.toFixed(2),
          nhf: nhfContribution.toFixed(2),
          basic: basicAmt.toFixed(2),
          housing: housingAmt.toFixed(2),
          transport: transportAmt.toFixed(2),
        })
        .execute();

      // Refresh allowances for this run+employee
      await trx
        .delete(payrollAllowances)
        .where(
          and(
            eq(payrollAllowances.payrollId, payrollRunId),
            eq(payrollAllowances.employeeId, employeeId),
          ),
        )
        .execute();

      if (payrollAllowancesData.length > 0) {
        await trx
          .insert(payrollAllowances)
          .values(
            payrollAllowancesData.map((a) => ({
              payrollId: inserted.payrollRunId,
              allowance_type: a.allowanceType,
              allowanceAmount: toDec(a.allowanceAmount).toFixed(2),
              employeeId: inserted.employeeId,
            })),
          )
          .execute();
      }

      // HOT: employee name from prepared stmt
      const [empRow] = await trx
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.id, inserted.employeeId))
        .limit(1);

      const fullName = empRow ? `${empRow.firstName} ${empRow.lastName}` : '';

      return { ...inserted, name: fullName };
    });

    return savedPayroll;
  }

  async calculatePayrollForCompany(
    user: User,
    payrollDate: string,
    groupId?: string,
  ) {
    const companyId = user.companyId;

    // 1) Who are we paying?
    const baseConditions = [eq(employees.companyId, companyId)];
    if (groupId) baseConditions.push(eq(employees.payGroupId, groupId));

    const allEmployees = await this.db
      .select({
        id: employees.id,
        employmentStatus: employees.employmentStatus,
        payGroupId: employees.payGroupId,
      })
      .from(employees)
      .where(and(...baseConditions))
      .execute();

    const employeesList = allEmployees.filter(
      (e) => e.employmentStatus === 'active',
    );

    if (employeesList.length === 0) {
      throw new BadRequestException(
        `No active employees found for company ${companyId}${groupId ? ` in group ${groupId}` : ''}`,
      );
    }

    // 2) Global settings & run id
    const payrollSettings =
      await this.payrollSettingsService.getAllPayrollSettings(companyId);
    const multi = payrollSettings.multi_level_approval;
    const chain = payrollSettings.approver_chain || '[]';

    // existing run for this company/date?
    const [existingRun] = await this.db
      .select()
      .from(payroll)
      .where(
        and(
          eq(payroll.companyId, companyId),
          eq(payroll.payrollDate, payrollDate),
        ),
      )
      .execute();

    const payrollRunId = existingRun?.payrollRunId ?? uuidv4();

    // 3) Approval workflow bootstrap (unchanged)
    let [workflow] = await this.db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.companyId, companyId),
          eq(approvalWorkflows.entityId, payrollRunId),
          eq(approvalWorkflows.entityDate, payrollDate),
        ),
      )
      .execute();

    if (!workflow) {
      [workflow] = await this.db
        .insert(approvalWorkflows)
        .values({
          name: 'Payroll Run',
          companyId,
          entityId: payrollRunId,
          entityDate: payrollDate,
        })
        .returning()
        .execute();
    }

    const workflowId = workflow.id;

    const existingSteps = await this.db
      .select()
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, workflowId))
      .execute();

    if (existingSteps.length === 0) {
      const steps = multi
        ? chain.reverse().map((role: any, idx: number) => ({
            workflowId,
            sequence: idx + 1,
            role,
            minApprovals: 1,
            maxApprovals: 1,
            createdAt: new Date(),
          }))
        : [
            {
              workflowId,
              sequence: 1,
              role: payrollSettings.approver ?? 'payroll_specialist',
              status: 'approved',
              minApprovals: 1,
              maxApprovals: 1,
              createdAt: new Date(),
            },
          ];

      const createdSteps = await this.db
        .insert(approvalSteps)
        .values(steps)
        .returning({ id: approvalSteps.id })
        .execute();

      await this.db
        .insert(payrollApprovals)
        .values(
          employeesList.map(() => ({
            payrollRunId,
            stepId: createdSteps[0].id,
            actorId: user.id,
            action: 'pending',
            remarks: 'Pending approval',
            createdAt: new Date(),
          })),
        )
        .execute();
    }

    if (!multi) {
      const [step] = await this.db
        .select()
        .from(approvalSteps)
        .where(
          and(
            eq(approvalSteps.workflowId, workflowId),
            eq(approvalSteps.sequence, 1),
          ),
        )
        .execute();

      if (step) {
        await this.db
          .insert(payrollApprovals)
          .values({
            payrollRunId,
            stepId: step.id,
            actorId: user.id,
            action: 'approved',
            remarks: 'Auto-approved',
            createdAt: new Date(),
          })
          .execute();
      }
    }

    // ----------------- NEW: batch prefetch of *hot* data -----------------
    const empIds = employeesList.map((e) => e.id);
    const payGroupIds = Array.from(
      new Set(
        employeesList.map((e) => e.payGroupId).filter(Boolean) as string[],
      ),
    );

    // derive month window (yyyy-MM-dd boundaries) once
    const month = payrollDate.slice(0, 7); // 'YYYY-MM'
    const startISO = `${month}-01`;
    // little helper to end of month yyyy-MM-dd (safe enough for batching)
    const endISO = new Date(`${month}-01T00:00:00Z`);
    endISO.setMonth(endISO.getMonth() + 1);
    endISO.setDate(0);
    const endISOstr = endISO.toISOString().slice(0, 10);

    // Call your batch prepared statements (names mirror your single-emp ones).
    // Implement these inside your HotQueries using named prepared statements + WHERE … IN (…) batching.
    const [
      deductionsRows,
      bonusesRows,
      payGroupsRows,
      groupAllowRows,
      adjustmentsRows,
      expensesRows,
    ] = await Promise.all([
      this.hot.activeDeductionsForMany(empIds, payrollDate), // -> [{employee_id, ...}, ...]
      this.hot.bonusesByRangeForMany(empIds, startISO, endISOstr), // -> [{employee_id, ...}, ...]
      this.hot.payGroupsByIds(payGroupIds), // -> [{id: pay_group_id, ...}, ...]
      this.hot.groupAllowancesForPayGroups(payGroupIds), // -> [{pay_group_id, ...}, ...]
      this.hot.adjustmentsByDateForMany(companyId, empIds, payrollDate), // -> [{employee_id, ...}, ...]
      this.hot.expensesByRangeForMany(empIds, startISO, endISOstr), // -> [{employee_id, ...}, ...]
    ]);

    // Build lookup maps the `this.hot` layer can read without querying again.
    const toMapArray = <T extends Record<string, any>>(
      rows: T[],
      key: string,
    ) => {
      const m = new Map<string, T[]>();
      for (const r of rows) {
        const k = String(r[key]);
        const arr = m.get(k);
        if (arr) arr.push(r);
        else m.set(k, [r]);
      }
      return m;
    };

    const deductionsByEmp = toMapArray(deductionsRows, 'employee_id');
    const bonusesByEmp = toMapArray(bonusesRows, 'employee_id');
    const adjustmentsByEmp = toMapArray(adjustmentsRows, 'employee_id');
    const expensesByEmp = toMapArray(expensesRows, 'employee_id');

    const payGroupById = new Map<string, any>(
      payGroupsRows.map((r: any) => [String(r.id), r]),
    );

    const groupAllowByPg = toMapArray(groupAllowRows, 'pay_group_id');

    const runCache: HotRunCache = {
      deductionsByEmp,
      bonusesByEmp,
      adjustmentsByEmp,
      expensesByEmp,
      payGroupById,
      groupAllowByPg,
    };

    // Prime the hot layer with this run’s cache so calculatePayroll() won’t hit the DB for these.
    // (this is a trivial in-memory Map; clear it after the run)
    this.hot.setRunCache(runCache);

    try {
      // 4) Calculate (reusing your unchanged per-employee method)
      const payrollResults = await pMap(
        employeesList,
        async (employee) =>
          this.calculatePayroll(
            employee.id,
            payrollDate,
            payrollRunId,
            companyId,
            user.id,
            workflowId,
          ),
        { concurrency: 12 }, // you can tune this
      );

      if (!multi) {
        await this.payslipService.generatePayslipsForCompany(
          companyId,
          payrollResults[0].payrollMonth,
        );
      }

      return {
        payrollRunId,
        payrollDate,
        employeeCount: employeesList.length,
        approvalWorkflowId: workflowId,
      };
    } finally {
      // Always clear to avoid cross-request bleed
      this.hot.clearRunCache();
    }
  }

  async getPayrollSummaryByRunId(runId: string) {
    // Pull everything you already persisted in `payroll`
    const rows = await this.db
      .select({
        employeeId: payroll.employeeId,
        payrollRunId: payroll.payrollRunId,
        payrollDate: payroll.payrollDate,
        payrollMonth: payroll.payrollMonth,

        basic: payroll.basic,
        housing: payroll.housing,
        transport: payroll.transport,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,

        bonuses: payroll.bonuses,
        payeTax: payroll.payeTax,
        pensionContribution: payroll.pensionContribution,
        employerPensionContribution: payroll.employerPensionContribution,
        nhfContribution: payroll.nhfContribution,

        totalDeductions: payroll.totalDeductions,
        taxableIncome: payroll.taxableIncome,
        salaryAdvance: payroll.salaryAdvance,

        reimbursements: payroll.reimbursements,
        voluntaryDeductions: payroll.voluntaryDeductions,

        isStarter: payroll.isStarter,
        approvalStatus: payroll.approvalStatus,

        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(payroll)
      .leftJoin(employees, eq(employees.id, payroll.employeeId))
      .where(eq(payroll.payrollRunId, runId))
      .execute();

    // Compute isLeaver per employee for the payroll month window.
    // (You can push this into SQL if you prefer.)
    const out = rows.map((r) => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(' ');
      const startDate = new Date(`${r.payrollMonth}-01T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      return {
        employeeId: r.employeeId,
        payrollRunId: r.payrollRunId,
        payrollDate: r.payrollDate,
        payrollMonth: r.payrollMonth,
        name,
        isStarter: Boolean(r.isStarter),

        basic: r.basic,
        housing: r.housing,
        transport: r.transport,
        grossSalary: r.grossSalary,
        netSalary: r.netSalary,

        bonuses: r.bonuses,
        payeTax: r.payeTax,
        pensionContribution: r.pensionContribution,
        employerPensionContribution: r.employerPensionContribution,
        nhfContribution: r.nhfContribution,

        totalDeductions: r.totalDeductions,
        taxableIncome: r.taxableIncome,
        salaryAdvance: r.salaryAdvance,

        reimbursements: r.reimbursements ?? [],
        voluntaryDeductions: r.voluntaryDeductions ?? [],

        approvalStatus: r.approvalStatus,
      };
    });

    // Optional: sort by name (or whatever the UI expects)
    out.sort((a, b) => a.name.localeCompare(b.name));

    return out;
  }

  async findOnePayRun(runId: string) {
    // 1) Verify it exists
    const exists = await this.db
      .select()
      .from(payroll)
      .where(eq(payroll.payrollRunId, runId))
      .execute();
    if (!exists.length) {
      throw new BadRequestException(`Payroll run ${runId} not found`);
    }

    // 2) Fetch all rows + join employee names & status
    const rows = await this.db
      .select({
        employeeId: payroll.employeeId,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,
        payeTax: payroll.payeTax,
        pensionContribution: payroll.pensionContribution,
        employerPensionContribution: payroll.employerPensionContribution,
        nhfContribution: payroll.nhfContribution,
        approvalStatus: payroll.approvalStatus,
        paymentStatus: payroll.paymentStatus,
        firstName: employees.firstName,
        lastName: employees.lastName,
        payrollRunId: payroll.payrollRunId,
        additionalDeductions: payroll.customDeductions,
        taxableIncome: payroll.taxableIncome,
        salaryAdvance: payroll.salaryAdvance,
        payrollMonth: payroll.payrollMonth,
        payrollDate: payroll.payrollDate,
        bonuses: payroll.bonuses,
        voluntaryDeductions: payroll.voluntaryDeductions,
        payslip_pdf_url: paySlips.pdfUrl,
        reimbursements: payroll.reimbursements,
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .leftJoin(paySlips, eq(paySlips.payrollId, payroll.id))
      .where(eq(payroll.payrollRunId, runId))
      .execute();

    // 3) Aggregate metrics
    const totalCostOfPayroll = rows.reduce((sum, r) => {
      const grossSalary = Number(r.grossSalary);
      const employerPension = Number(r.employerPensionContribution);

      // Sum reimbursements for this row:
      const reimbursementsArray = Array.isArray(r.reimbursements)
        ? r.reimbursements
        : [];
      const reimbursementTotal = reimbursementsArray.reduce((acc, item) => {
        return acc + Number(item.amount || 0);
      }, 0);

      return sum + grossSalary + employerPension + reimbursementTotal;
    }, 0);

    const totalPensionContribution = rows.reduce(
      (sum, r) => sum + Number(r.pensionContribution),
      0,
    );
    const totalPAYE = rows.reduce((sum, r) => sum + Number(r.payeTax), 0);

    const totalNHFContribution = rows.reduce(
      (sum, r) => sum + Number(r.nhfContribution),
      0,
    );

    // 4) Map to per-employee DTOs
    const employeesDto = rows.map((r) => ({
      employeeId: r.employeeId,
      name: `${r.firstName} ${r.lastName}`,
      grossSalary: Number(r.grossSalary),
      netSalary: Number(r.netSalary),
      approvalStatus: r.approvalStatus,
      paymentStatus: r.paymentStatus,
      payeTax: Number(r.payeTax),
      pensionContribution: Number(r.pensionContribution),
      nhfContribution: Number(r.nhfContribution),
      employerPensionContribution: Number(r.employerPensionContribution),
      additionalDeductions: Number(r.additionalDeductions),
      taxableIncome: Number(r.taxableIncome),
      salaryAdvance: Number(r.salaryAdvance),
      payrollMonth: r.payrollMonth,
      payrollRunId: r.payrollRunId,
      payrollDate: r.payrollDate,
      bonuses: Number(r.bonuses),
      voluntaryDeductions: r.voluntaryDeductions,
      payslip_pdf_url: r.payslip_pdf_url,
      reimbursements: r.reimbursements,
    }));

    return {
      totalCostOfPayroll,
      totalPensionContribution,
      totalPAYE,
      totalNHFContribution,
      payrollRunId: rows[0].payrollRunId,
      employees: employeesDto,
    };
  }

  async sendForApproval(runId: string, actorId: string, remarks?: string) {
    // 1) make sure that run exists
    const existing = await this.db
      .select()
      .from(payroll)
      .where(eq(payroll.payrollRunId, runId))
      .limit(1)
      .execute();

    if (existing.length === 0) {
      throw new NotFoundException(`No payroll found for run ${runId}`);
    }

    // 1.1) check if already submitted
    if (existing[0].approvalStatus === 'submitted') {
      throw new BadRequestException(
        `Payroll run already submitted on ${existing[0].lastApprovalAt}`,
      );
    }

    // 1.2) check if already approved
    if (existing[0].approvalStatus === 'approved') {
      throw new BadRequestException(
        `Payroll run already approved on ${existing[0].approvalDate}`,
      );
    }

    const now = new Date();

    // 2) update all rows in that run to "submitted"
    const { numUpdatedRows } = await this.db
      .update(payroll)
      .set({
        approvalStatus: 'submitted', // or whatever your “awaiting” state is called
        lastApprovalAt: now,
        lastApprovedBy: actorId, // track who submitted
      })
      .where(eq(payroll.payrollRunId, runId))
      .execute();

    // 3) record the action in the approvals log
    await this.db
      .update(payrollApprovals)
      .set({
        action: 'submitted',
        remarks: remarks ?? '',
      })
      .where(
        and(
          eq(payrollApprovals.payrollRunId, existing[0].id),
          eq(payrollApprovals.actorId, actorId),
        ),
      )
      .execute();

    const payrollSettings =
      await this.payrollSettingsService.getAllPayrollSettings(
        existing[0].companyId,
      );

    // 4) Determine approvers
    let approverList: string[] = [];
    let approverRole: string | null = null;

    if (payrollSettings.multi_level_approval) {
      // Single approver mode
      approverList = payrollSettings.approver_chain?.slice().reverse() || [];
      approverRole = approverList[0];
    } else {
      // Multi-step approval
      approverRole = payrollSettings.approver;
    }

    // 5) Fetch approvers
    const [currentUserForApproval] = await this.db
      .select({
        id: users.id,
        role: companyRoles.name,
        email: users.email,
        name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        companyName: companies.name,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .innerJoin(companies, eq(users.companyId, companies.id))
      .where(
        and(
          eq(users.companyId, existing[0].companyId),
          eq(
            companyRoles.name,
            approverRole as
              | 'super_admin'
              | 'admin'
              | 'hr_manager'
              | 'hr_assistant'
              | 'recruiter'
              | 'payroll_specialist',
          ),
        ),
      );

    const url = `${this.configService.get('CLIENT_DASHBOARD_URL')}/payroll/payroll-approval/${runId}`;

    // 6) Send notifications to approvers
    await this.payrollApprovalEmailService.sendApprovalEmail(
      currentUserForApproval.email,
      currentUserForApproval.name,
      url,
      existing[0].payrollDate,
      currentUserForApproval.companyName,
    );

    return { updatedCount: numUpdatedRows };
  }

  async approvePayrollRun(runId: string, user: User, remarks?: string) {
    const [payrollRow] = await this.db
      .select({
        payrollRunId: payroll.payrollRunId,
        workflowId: payroll.workflowId,
        approvalStatus: payroll.approvalStatus,
        approvalDate: payroll.approvalDate,
      })
      .from(payroll)
      .where(eq(payroll.payrollRunId, runId))
      .limit(1)
      .execute();

    if (!payrollRow) {
      throw new NotFoundException(`No payroll found for run ${runId}`);
    }

    if (payrollRow.approvalStatus === 'approved') {
      throw new BadRequestException(
        `Payroll run already approved on ${payrollRow.approvalDate}`,
      );
    }

    // 2) Get all approval steps
    const steps = await this.db
      .select({
        id: approvalSteps.id,
        sequence: approvalSteps.sequence,
        role: approvalSteps.role,
        status: approvalSteps.status,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, payrollRow.workflowId))
      .orderBy(approvalSteps.sequence)
      .execute();

    if (steps.length === 0) {
      throw new BadRequestException(`No approval steps configured`);
    }

    // 3) Find current step (first pending)
    const currentStep = steps.find((s) => s.status === 'pending');
    if (!currentStep) {
      throw new BadRequestException(`No pending steps left to approve`);
    }

    const payrollSettings =
      await this.payrollSettingsService.getAllPayrollSettings(user.companyId);
    const fallbackRoles = payrollSettings.approval_fallback || '[]';
    const isFallback = fallbackRoles.includes(user.role);
    const actorRole = currentStep.role; // This should be resolved based on your user system

    if (actorRole !== user.role && !isFallback) {
      throw new BadRequestException(
        `Actor ${user.role} does not have permission to approve this step`,
      );
    }

    // 5) Approve the current step
    await this.db
      .update(approvalSteps)
      .set({ status: 'approved' })
      .where(eq(approvalSteps.id, currentStep.id))
      .execute();

    // 6) Log approval in audit
    await this.db.insert(payrollApprovals).values({
      payrollRunId: runId,
      actorId: user.id,
      action: 'approved',
      remarks: remarks ?? '',
      stepId: currentStep.id,
    });

    // 7) If this was the last step, mark payroll as approved
    const allApproved = steps.every(
      (s) => s.id === currentStep.id || s.status === 'approved',
    );

    if (allApproved) {
      const now = new Date();
      const result = await this.db
        .update(payroll)
        .set({
          approvalStatus: 'approved',
          approvalDate: now.toDateString(),
          lastApprovalAt: now,
          lastApprovedBy: user.id,
        })
        .where(eq(payroll.payrollRunId, runId))
        .returning({
          payrollMonth: payroll.payrollMonth,
        })
        .execute();

      await this.payslipService.generatePayslipsForCompany(
        user.companyId,
        result[0].payrollMonth,
      );
    }

    return 'Payroll run approved successfully';
  }

  async checkApprovalStatus(runId: string) {
    // 1) Make sure that run exists and grab its workflowId + status
    const [payrollRow] = await this.db
      .select({
        workflowId: payroll.workflowId,
        approvalStatus: payroll.approvalStatus,
        payrollDate: payroll.payrollDate,
      })
      .from(payroll)
      .where(eq(payroll.payrollRunId, runId))
      .limit(1)
      .execute();

    if (!payrollRow) {
      throw new NotFoundException(`No payroll found for run ${runId}`);
    }

    // 2) Fetch *all* approval steps for that workflow, ordered by sequence
    const steps = await this.db
      .select({
        id: approvalSteps.id,
        sequence: approvalSteps.sequence,
        role: approvalSteps.role,
        minApprovals: approvalSteps.minApprovals,
        maxApprovals: approvalSteps.maxApprovals,
        createdAt: approvalSteps.createdAt,
        status: approvalSteps.status,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, payrollRow.workflowId))
      .orderBy(approvalSteps.sequence)
      .execute();

    // 3) Return combined structure
    return {
      payrollDate: payrollRow.payrollDate,
      approvalStatus: payrollRow.approvalStatus,
      approvalSteps: steps,
    };
  }

  // Make As Completed
  async markAsInProgress(runId: string, user: User) {
    // 1) Make sure that run exists
    const [payrollRow] = await this.db
      .select()
      .from(payroll)
      .where(eq(payroll.payrollRunId, runId))
      .limit(1)
      .execute();

    if (!payrollRow) {
      throw new NotFoundException(`No payroll found for run ${runId}`);
    }

    // 2) Update the status to "completed"
    await this.db
      .update(payroll)
      .set({ paymentStatus: 'in-progress', approvalStatus: 'completed' })
      .where(eq(payroll.payrollRunId, runId))
      .execute();

    // Audit log
    await this.auditService.logAction({
      userId: user.id,
      action: 'create',
      details: 'Payroll run marked as in-progress',
      entityId: runId,
      entity: 'payroll_run',
      changes: {
        payrollRunId: runId,
        status: 'in-progress',
        updatedBy: user.id,
      },
    });
  }

  // Update Payroll Approval Status
  async updatePayrollPaymentStatus(
    user: User,
    payrollRunId: string,
    paymentStatus: string,
  ) {
    const result = await this.db
      .update(payroll)
      .set({
        paymentStatus,
        paymentDate: new Date().toISOString().split('T')[0],
      })
      .where(
        and(
          eq(payroll.companyId, user.companyId),
          eq(payroll.payrollRunId, payrollRunId),
        ),
      )
      .returning({
        payrollMonth: payroll.payrollMonth,
        salaryAdvance: payroll.salaryAdvance,
        employeeId: payroll.employeeId,
        expenses: payroll.reimbursements,
      })
      .execute();

    // remove salary advance
    for (const entry of result) {
      if (entry.salaryAdvance !== null && Number(entry.salaryAdvance) > 0) {
        const [advance] = await this.db
          .select()
          .from(salaryAdvance)
          .where(eq(salaryAdvance.employeeId, entry.employeeId))
          .limit(1)
          .execute();

        await this.salaryAdvanceService.repayAdvance(
          advance.id,
          Number(advance.preferredMonthlyPayment),
        );
      }
    }

    const expenseIds: string[] = result.flatMap((r) => {
      if (!r.expenses) return [];

      return (r.expenses as any[]).map((e) =>
        typeof e === 'object' && e !== null && 'id' in e ? e.id : e,
      );
    });

    // Finally update expenses
    if (expenseIds.length > 0) {
      await this.db
        .update(expenses)
        .set({ status: 'paid' })
        .where(inArray(expenses.id, expenseIds))
        .execute();
    }

    await this.taxService.onPayrollApproval(
      user.companyId,
      result[0].payrollMonth,
      payrollRunId,
    );

    const getPayslips = await this.db
      .select()
      .from(paySlips)
      .where(eq(paySlips.payrollMonth, result[0].payrollMonth))
      .execute();

    for (const payslip of getPayslips) {
      await this.payrollQueue.add(
        'generatePayslipPdf',
        {
          payslipId: payslip.id,
        },
        { delay: 3000 },
      );

      // await this.payrollQueue.add('PayslipGeneratedNotification', {
      //   employee_id: payslip.employee_id,
      //   title: 'Payslip Ready',
      //   message: `Your payslip for ${result[0].payroll_month} is ready to view.`,
      //   dataMessage: { payslipId: payslip.id },
      // });
    }

    // audit log
    await this.auditService.logAction({
      userId: user.id,
      action: 'update',
      details: 'Payroll run payment status updated',
      entityId: payrollRunId,
      entity: 'payroll_run',
      changes: {
        payrollRunId,
        status: paymentStatus,
        updatedBy: user.id,
      },
    });

    return result;
  }

  async discardPayrollRun(user: User, payrollRunId: string) {
    const companyId = user.companyId;
    if (!payrollRunId)
      throw new BadRequestException('payrollRunId is required');

    return this.db.transaction(async (trx) => {
      // 0) Gather rows (and the shared date/workflow)
      const rows = await trx
        .select({
          id: payroll.id,
          employeeId: payroll.employeeId,
          payrollDate: payroll.payrollDate,
          workflowId: payroll.workflowId,
        })
        .from(payroll)
        .where(
          and(
            eq(payroll.companyId, companyId),
            eq(payroll.payrollRunId, payrollRunId),
          ),
        );

      if (rows.length === 0)
        throw new NotFoundException(
          'No payroll found for this run and company.',
        );

      const empIds = rows.map((r) => r.employeeId);
      const payrollDate = rows[0].payrollDate;
      const workflowId = rows[0].workflowId ?? null;

      // 1) Remove run-scoped extras first
      await trx
        .delete(payrollAllowances)
        .where(
          and(
            eq(payrollAllowances.payrollId, payrollRunId),
            inArray(payrollAllowances.employeeId, empIds),
          ),
        );

      await trx
        .delete(payrollYtd)
        .where(
          and(
            eq(payrollYtd.companyId, companyId),
            eq(payrollYtd.payrollDate, payrollDate),
            inArray(payrollYtd.employeeId, empIds),
          ),
        );

      await trx
        .delete(payrollApprovals)
        .where(eq(payrollApprovals.payrollRunId, payrollRunId));

      // 2) Remove the payroll rows (this frees the FK to approval_workflows)
      await trx
        .delete(payroll)
        .where(
          and(
            eq(payroll.companyId, companyId),
            eq(payroll.payrollRunId, payrollRunId),
          ),
        );

      // 3) Now it’s safe to remove the workflow + steps
      if (workflowId) {
        await trx
          .delete(approvalSteps)
          .where(eq(approvalSteps.workflowId, workflowId));
        await trx
          .delete(approvalWorkflows)
          .where(
            and(
              eq(approvalWorkflows.companyId, companyId),
              eq(approvalWorkflows.entityId, payrollRunId),
            ),
          );
      }

      return {
        payrollRunId,
        deletedEmployees: rows.length,
        payrollDate,
        status: 'discarded',
      };
    });
  }
}
