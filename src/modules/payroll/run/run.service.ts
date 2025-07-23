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
  companyRoles,
  employees,
  users,
} from 'src/drizzle/schema';
import { and, eq, gte, inArray, isNull, lt, lte, or } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { payrollAllowances } from '../schema/payroll-allowances.schema';
import { payrollYtd } from '../schema/payroll-ytd.schema';
import { v4 as uuidv4 } from 'uuid';
import { payroll, payrollApprovals } from '../schema/payroll-run.schema';
import { payrollBonuses } from '../schema/payroll-bonuses.schema';
import { payGroups } from '../schema/pay-groups.schema';
import { PayrollSettingsService } from '../settings/payroll-settings.service';
import { CompensationService } from 'src/modules/core/employees/compensation/compensation.service';
import { payGroupAllowances } from '../schema/pay-group-allowances.schema';
import { User } from 'src/common/types/user.type';
import { format } from 'date-fns';
import { TaxService } from '../tax/tax.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PayslipService } from '../payslip/payslip.service';
import { paySlips } from '../schema/payslip.schema';
import { countWorkingDays } from 'src/utils/workingDays.utils';
import { payrollAdjustments } from '../schema/payroll-adjustments.schema';
import { SalaryAdvanceService } from '../salary-advance/salary-advance.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import { EmailVerificationService } from 'src/modules/notification/services/email-verification.service';
import Decimal from 'decimal.js';
import { employeeDeductions } from '../schema/deduction.schema';
import { salaryAdvance } from '../salary-advance/schema/salary-advance.schema';
import { expenses } from 'src/modules/expenses/schema/expense.schema';

@Injectable()
export class RunService {
  constructor(
    @InjectQueue('payrollQueue') private payrollQueue: Queue,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly payrollSettingsService: PayrollSettingsService,
    private readonly compensationService: CompensationService,
    private readonly taxService: TaxService,
    private readonly payslipService: PayslipService,
    private readonly salaryAdvanceService: SalaryAdvanceService,
    private readonly pusher: PusherService,
    private readonly emailVerificationService: EmailVerificationService, // TODO: remove this
  ) {}

  private calculatePAYE(
    annualSalary: Decimal.Value,
    pensionDeduction: Decimal.Value,
    nhfDeduction: Decimal.Value,
    taxRelief: Decimal.Value,
  ): { paye: Decimal; taxableIncome: Decimal } {
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
      0,
    );

    // PAYE Tax Brackets (in Naira)
    const brackets = [
      { limit: new Decimal(300_000), rate: 0.07 },
      { limit: new Decimal(600_000), rate: 0.11 },
      { limit: new Decimal(1_100_000), rate: 0.15 },
      { limit: new Decimal(1_600_000), rate: 0.19 },
      { limit: new Decimal(3_200_000), rate: 0.21 },
      { limit: new Decimal(Infinity), rate: 0.24 },
    ];

    let paye = new Decimal(0);
    let remaining = new Decimal(taxableIncome);
    let previousLimit = new Decimal(0);

    for (const bracket of brackets) {
      if (remaining.lte(0)) break;

      const range = Decimal.min(remaining, bracket.limit.minus(previousLimit));
      paye = paye.plus(range.mul(bracket.rate));
      remaining = remaining.minus(range);
      previousLimit = bracket.limit;
    }

    return {
      paye: paye.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      taxableIncome: taxableIncome.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    };
  }

  private percentOf(base: Decimal.Value, pct: Decimal.Value): Decimal {
    return new Decimal(base)
      .mul(pct)
      .div(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  private round2(value: Decimal.Value): number {
    return Number(
      new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
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
    const payrollStart = new Date(`${payrollMonth}-01T00:00:00Z`); // e.g. 2025-05-01
    const payrollEnd = new Date(payrollStart);
    payrollEnd.setMonth(payrollEnd.getMonth() + 1);
    payrollEnd.setDate(0);
    const startDate = payrollStart;
    const endDate = new Date(payrollStart);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const isStarter =
      new Date(employee.startDate) >= new Date(payrollStart) &&
      new Date(employee.startDate) <= new Date(payrollEnd);

    // 2) Parallel fetch: deductions, bonuses, payGroup, settings, group‐level allowances
    const [
      unpaidAdvance,
      activeDeductions,
      bonuses,
      payGroup,
      payrollSettings,
      groupRows,
      adjustments,
      activeExpenses,
    ] = await Promise.all([
      this.salaryAdvanceService.getUnpaidAdvanceDeductions(employee.employeeId),
      this.db
        .select()
        .from(employeeDeductions)
        .where(
          and(
            eq(employeeDeductions.employeeId, employeeId),
            eq(employeeDeductions.isActive, true),
            lte(employeeDeductions.startDate, payrollDate), // started on or before payroll date
            or(
              gte(employeeDeductions.endDate, payrollDate), // ends after payroll date
              isNull(employeeDeductions.endDate), // or no end date (open)
            ),
          ),
        ),

      this.db
        .select()
        .from(payrollBonuses)
        .where(
          and(
            eq(payrollBonuses.employeeId, employeeId),
            gte(
              payrollBonuses.effectiveDate,
              startDate.toISOString().slice(0, 10),
            ),
            lt(
              payrollBonuses.effectiveDate,
              endDate.toISOString().slice(0, 10),
            ),
          ),
        )
        .execute(),

      this.db
        .select()
        .from(payGroups)
        .where(eq(payGroups.id, employee.payGroupId!))
        .execute(),

      this.payrollSettingsService.getAllPayrollSettings(companyId),

      this.db
        .select({
          type: payGroupAllowances.allowanceType,
          valueType: payGroupAllowances.valueType,
          pct: payGroupAllowances.percentage,
          fixed: payGroupAllowances.fixedAmount,
        })
        .from(payGroupAllowances)
        .where(eq(payGroupAllowances.payGroupId, employee.payGroupId!))
        .execute(),

      this.db
        .select()
        .from(payrollAdjustments)
        .where(
          and(
            eq(payrollAdjustments.companyId, companyId),
            eq(payrollAdjustments.employeeId, employeeId),
            eq(payrollAdjustments.payrollDate, payrollDate),
          ),
        )
        .execute(),

      this.db
        .select({
          id: expenses.id,
          category: expenses.category,
          amount: expenses.amount,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.employeeId, employeeId),
            eq(expenses.status, 'pending'),
            gte(expenses.submittedAt, startDate),
            lte(expenses.submittedAt, endDate),
          ),
        ),
    ]);

    // Salary advance deduction
    const unpaidAdvanceAmount = new Decimal(
      unpaidAdvance?.[0]?.monthlyDeduction || 0,
    );

    // Split by taxability
    const taxableAdjustments = adjustments.filter((a) => a.taxable);
    const nonTaxableAdjustments = adjustments.filter((a) => !a.taxable);

    const totalTaxableAdjustments = taxableAdjustments.reduce(
      (sum, a) => sum.plus(a.amount || 0),
      new Decimal(0),
    );

    const totalBonuses = (bonuses || []).reduce(
      (sum, b) => sum.plus(b.amount || 0),
      new Decimal(0),
    );

    // 3) Fetch employee's gross salary
    let grossPay = new Decimal(employee.grossSalary).div(12);

    // 3a) Proration
    if (payrollSettings.enable_proration && isStarter) {
      const joinDate = new Date(employee.startDate);
      const leaveDate = employee.endDate ? new Date(employee.endDate) : null;

      let fromDate = startDate;
      if (joinDate >= startDate && joinDate <= endDate) {
        fromDate = joinDate;
      }

      let toDate = endDate;
      if (leaveDate && leaveDate >= startDate && leaveDate <= endDate) {
        toDate = leaveDate;
      }

      // inclusive-day counter (UTC)
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

      // apply proration
      grossPay = grossPay.mul(new Decimal(daysWorked).div(daysInPeriod));
    }

    const grossSalary = grossPay
      .plus(totalBonuses)
      .plus(totalTaxableAdjustments);

    // 4) Read global defaults (array of {type, percentage?, fixedAmount?})
    const globalAllowances = (payrollSettings.allowance_others ?? []) as Array<{
      type: string;
      percentage?: number;
      fixedAmount?: number;
    }>;

    // 5) Build globalRows and merge with groupRows (group overrides)
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

    // 6) Fetch BHT percents
    const basicPct = payrollSettings.basic_percent ?? 50;
    const housingPct = payrollSettings.housing_percent ?? 30;
    const transportPct = payrollSettings.transport_percent ?? 20;

    // 7) Validate percent totals (BHT + % allowances ≤ 100)
    const pctAllowTotal = merged
      .filter((a) => a.valueType === 'percentage')
      .reduce((sum, a) => sum + Number(a.pct), 0);
    const bhtPctTotal = basicPct + housingPct + transportPct;
    if (bhtPctTotal + pctAllowTotal > 100) {
      throw new BadRequestException(
        `BHT% (${bhtPctTotal}%) + allowance% (${pctAllowTotal}%) exceed 100%.`,
      );
    }

    // 8) Carve out fixed allowances first
    const fixedAllowances = merged
      .filter((a) => a.valueType === 'fixed')
      .map((a) => ({ type: a.type, fixed: Number(a.fixed) }));

    const fixedSum = fixedAllowances.reduce(
      (sum, a) => sum.plus(a.fixed),
      new Decimal(0),
    );

    if (fixedSum > grossSalary) {
      throw new BadRequestException(
        `Fixed allowances (₦${(fixedSum.toNumber() / 100).toFixed(2)}) exceed gross salary (₦${(grossSalary.toNumber() / 100).toFixed(2)}).`,
      );
    }

    // 9) Remaining budget for BHT + %‐based allowances
    const budget = grossSalary.minus(fixedSum);

    // 10) Allocate BHT from budget
    let basicAmt = this.percentOf(budget, payrollSettings.basic_percent);
    const housingAmt = this.percentOf(budget, payrollSettings.housing_percent);
    const transportAmt = this.percentOf(
      budget,
      payrollSettings.transport_percent,
    );

    // 11) Allocate percentage‐based allowances
    const pctAllowances = merged
      .filter((a) => a.valueType === 'percentage')
      .map((a) => ({
        type: a.type,
        // use Decimal end-to-end, then round *before* DB insert
        amount: new Decimal(a.pct ?? 0)
          .div(100)
          .mul(budget)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      }));

    merged.sort((a, b) => a.type.localeCompare(b.type));

    // 12) Combine fixed + percentage allowances
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

    // 13) Handle rounding difference: ensure sum of all = grossSalary
    const sumBHT = basicAmt.plus(housingAmt).plus(transportAmt);
    const sumPct = pctAllowances.reduce(
      (s, a) => s.plus(a.amount),
      new Decimal(0),
    );
    const sumFixed = fixedSum;
    const totalUsed = sumBHT
      .plus(new Decimal(sumPct))
      .plus(new Decimal(sumFixed));
    const diff = grossSalary.minus(totalUsed);
    basicAmt = basicAmt.plus(diff); // absorb rounding diff in Basic

    // 14) Statutory deduction flags & percentages
    const payGroupSettings = payGroup[0] || {};
    const relief = payrollSettings.default_tax_relief ?? 200000;

    // 1) Compute total BHT from your rounded components
    const bhtTotal = basicAmt.plus(housingAmt).plus(transportAmt);

    // 2) Ensure your percents are numbers
    const empPct = new Decimal(
      payrollSettings.default_pension_employee_percent || 8,
    );
    const erPct = new Decimal(
      payrollSettings.default_pension_employer_percent || 10,
    );
    const nhfPct = new Decimal(payrollSettings.nhf_percent || 2.5);

    // 3) Recheck your flags
    const applyPension = Boolean(
      payGroupSettings.applyPension ?? payrollSettings.apply_pension ?? false,
    );

    const applyNHF = Boolean(
      (payGroupSettings.applyNhf ?? payrollSettings.apply_nhf ?? false) &&
        employee.applyNhf, // employee-level flag from your employees table
    );

    // 4) Calculate contributions, flooring each to avoid float quirks
    // 4) Calculate contributions using Decimal
    const employeePensionContribution = applyPension
      ? this.percentOf(bhtTotal, empPct)
      : new Decimal(0);

    const employerPensionContribution = applyPension
      ? this.percentOf(bhtTotal, erPct)
      : new Decimal(0);

    const nhfContribution = applyNHF
      ? this.percentOf(basicAmt, nhfPct)
      : new Decimal(0);

    // Annualize gross with Decimal
    const annualizedGross = grossSalary.mul(12);

    // 5) Calculate PAYE with precise inputs
    const { paye, taxableIncome } = this.calculatePAYE(
      annualizedGross, // Decimal
      employeePensionContribution, // Decimal
      nhfContribution, // Decimal
      new Decimal(relief), // Decimal
    );

    // Ensure paye and taxableIncome are Decimal instances
    const payeDec = new Decimal(paye);
    const taxableIncomeDec = new Decimal(taxableIncome);

    // 6) Monthly values (rounded to 2 d.p.)
    const monthlyPAYE = payeDec
      .div(12)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const monthlyTaxableIncome = taxableIncomeDec
      .div(12)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    // 17) Sum custom deductions (safely with Decimal)
    const deductionBreakdown: { typeId: string; amount: string }[] = [];

    const totalPostTaxDeductions = (activeDeductions || []).reduce(
      (sum, deduction) => {
        const value =
          deduction.rateType === 'percentage'
            ? grossSalary.mul(new Decimal(deduction.rateValue)).div(100)
            : new Decimal(deduction.rateValue);

        deductionBreakdown.push({
          typeId: deduction.deductionTypeId,
          amount: value.toFixed(2),
        });

        return sum.plus(value);
      },
      new Decimal(0),
    );

    // Sum non-taxable adjustments
    const totalNonTaxable = nonTaxableAdjustments.reduce(
      (sum, a) => sum.plus(a.amount || 0),
      new Decimal(0),
    );

    const reimbursedTotal = activeExpenses.reduce(
      (sum, expense) => sum.plus(new Decimal(expense.amount || 0)),
      new Decimal(0),
    );

    const reimbursedExpenses = activeExpenses.map((expense) => ({
      id: expense.id, // Assuming you have an 'id' field for the expense
      expenseName: expense.category, // Assuming you have a 'category' field for the expense type
      amount: new Decimal(expense.amount || 0).toFixed(2), // Ensure amount is properly formatted
    }));

    // Total deductions: PAYE + Pension + NHF + Custom
    const totalDeductions = new Decimal(monthlyPAYE)
      .plus(employeePensionContribution)
      .plus(nhfContribution)
      .plus(totalPostTaxDeductions);

    // Compute net salary
    const netSalary = Decimal.max(
      new Decimal(grossSalary)
        .plus(totalNonTaxable) // allowances, etc.
        .plus(reimbursedTotal) // reimbursed expenses
        .minus(unpaidAdvanceAmount) // salary advances
        .minus(totalDeductions), // PAYE, pension, NHF, custom deductions
      0,
    ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const savedPayroll = await this.db.transaction(async (trx) => {
      // Approval Workflow
      const multi = payrollSettings.multi_level_approval;
      const approvalStatus = multi ? 'pending' : 'approved';
      const approvalDate = multi ? null : new Date().toISOString();
      const approvalRemarks = multi ? null : 'Auto-approved';

      // 5. Proceed to payroll data persistence
      await trx
        .delete(payroll)
        .where(
          and(
            eq(payroll.employeeId, employeeId),
            eq(payroll.payrollDate, payrollDate),
            eq(payroll.companyId, companyId),
          ),
        )
        .execute();

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
        .delete(payrollAllowances)
        .where(
          and(
            eq(payrollAllowances.payrollId, payrollRunId),
            eq(payrollAllowances.employeeId, employeeId),
          ),
        )
        .execute();

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
          approvalStatus: approvalStatus,
          approvalDate,
          approvalRemarks: approvalRemarks,
          requestedBy: userId,
          workflowId: workflowId,
          currentStep: multi ? 0 : 1,
          isStarter: isStarter ? true : false,
        })
        .returning()
        .execute();

      const [emp] = await trx
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.id, inserted.employeeId))
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

      if (payrollAllowancesData.length > 0) {
        await trx
          .insert(payrollAllowances)
          .values(
            payrollAllowancesData.map((a) => ({
              payrollId: inserted.payrollRunId,
              allowance_type: a.allowanceType,
              allowanceAmount: new Decimal(a.allowanceAmount).toFixed(2),
              employeeId: inserted.employeeId,
            })),
          )
          .execute();
      }

      return {
        ...inserted,
        name: `${emp.firstName} ${emp.lastName}`,
      };
    });

    return savedPayroll;
  }

  async calculatePayrollForCompany(
    user: User,
    payrollDate: string,
    groupId?: string,
  ) {
    const companyId = user.companyId; //  TODO edit and avoid duplicate

    const baseConditions = [eq(employees.companyId, companyId)];

    if (groupId) baseConditions.push(eq(employees.payGroupId, groupId));

    const allEmployees = await this.db
      .select({
        id: employees.id,
        employmentStatus: employees.employmentStatus,
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

    // 3. Load payroll settings
    const payrollSettings =
      await this.payrollSettingsService.getAllPayrollSettings(companyId);
    const multi = payrollSettings.multi_level_approval;
    const chain = payrollSettings.approver_chain || '[]';

    // 4. Reuse or create payrollRun
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

    // 5. Create or fetch approvalWorkflow
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

    // 6. Create approval steps (once)
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
        .returning({
          id: approvalSteps.id,
        })
        .execute();

      // Create initial approval records for each employee
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

    // 7. Auto-approve if not multi-level
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

    // 8. Calculate payroll for each unprocessed employee
    const payrollResults = await pMap(
      employeesList,
      async (employee) => {
        return this.calculatePayroll(
          employee.id,
          payrollDate,
          payrollRunId,
          companyId,
          user.id,
          workflowId,
        );
      },
      { concurrency: 10 }, // Adjust based on your DB capacity
    );

    if (!multi) {
      await this.payslipService.generatePayslipsForCompany(
        companyId,
        payrollResults[0].payrollMonth,
      );
    }

    return payrollResults;
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
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
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

    // 6) Send notifications to approvers
    await this.emailVerificationService.sendVerifyEmail(
      currentUserForApproval.email,
      'Payroll Run Approval',
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
}
