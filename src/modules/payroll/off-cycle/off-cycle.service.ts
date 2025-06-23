import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateOffCycleDto } from './dto/create-off-cycle.dto';
// import { UpdateOffCycleDto } from './dto/update-off-cycle.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and, sql, lt } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { offCyclePayroll } from './schema/off-cycle.schema';
import { User } from 'src/common/types/user.type';
import { v4 as uuidv4 } from 'uuid';
import { PayrollSettingsService } from '../settings/payroll-settings.service';
import Decimal from 'decimal.js';
import { payroll, payrollApprovals } from '../schema/payroll-run.schema';
import { employees } from 'src/drizzle/schema';
import { payrollYtd } from '../schema/payroll-ytd.schema';
import {
  approvalSteps,
  approvalWorkflows,
} from '../../../company-settings/schema/approval-workflow.schema';
import { employeeCompensations } from 'src/modules/core/employees/schema/compensation.schema';

@Injectable()
export class OffCycleService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
    private readonly payrollSettingsService: PayrollSettingsService,
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

  private async calculateOffCyclePayroll(
    runId: string,
    companyId: string,
    userId: string,
    workflowId: string,
  ) {
    // 1️⃣ Fetch all off-cycle entries for the run
    const entries = await this.db
      .select()
      .from(offCyclePayroll)
      .where(
        and(
          eq(offCyclePayroll.companyId, companyId),
          eq(offCyclePayroll.payrollRunId, runId),
        ),
      )
      .execute();

    if (!entries.length) {
      throw new Error('No entries found for this off-cycle run');
    }

    // 2️⃣ Get payroll settings
    const settings =
      await this.payrollSettingsService.getAllPayrollSettings(companyId);
    const relief = new Decimal(settings.default_tax_relief || 200000);
    const empPct = new Decimal(settings.default_pension_employee_percent || 8);
    const erPct = new Decimal(settings.default_pension_employer_percent || 10);
    const nhfPct = new Decimal(settings.nhf_percent || 2.5);
    const multi = settings.multi_level_approval;

    const results = await Promise.all(
      entries.map(async (entry) => {
        const payrollDate = entry.payrollDate;
        const payrollMonth = payrollDate.toString().slice(0, 7);
        const employeeId = entry.employeeId;

        const [comp] = await this.db
          .select()
          .from(employeeCompensations)
          .where(eq(employeeCompensations.employeeId, employeeId))
          .limit(1)
          .execute();

        const shouldApplyNHF = comp?.applyNHf ?? true;

        const grossSalary = new Decimal(entry.amount);
        const employeePension = entry.taxable
          ? grossSalary.mul(empPct.div(100))
          : new Decimal(0);
        const employerPension = entry.taxable
          ? grossSalary.mul(erPct.div(100))
          : new Decimal(0);
        const nhf =
          entry.taxable && shouldApplyNHF
            ? grossSalary.mul(nhfPct.div(100))
            : new Decimal(0);

        let paye = new Decimal(0);
        let taxableIncome = new Decimal(0);

        if (entry.taxable) {
          const [ytd] = await this.db
            .select({
              totalGross: sql<number>`COALESCE(SUM(${payrollYtd.grossSalary}), 0)`,
              totalPAYE: sql<number>`COALESCE(SUM(${payrollYtd.PAYE}), 0)`,
              count: sql<number>`COUNT(*)`,
            })
            .from(payrollYtd)
            .where(
              and(
                eq(payrollYtd.employeeId, employeeId),
                eq(payrollYtd.companyId, companyId),
                lt(payrollYtd.payrollDate, payrollDate),
              ),
            )
            .execute();

          const ytdGross = new Decimal(ytd?.totalGross || 0);
          const ytdPAYE = new Decimal(ytd?.totalPAYE || 0);
          const monthsCompleted = new Decimal(ytd?.count || 0);

          const monthsRemaining = Decimal.max(
            12 - monthsCompleted.minus(1).toNumber(),
            1,
          );
          const projectedAnnualGross = ytdGross.plus(
            grossSalary.mul(monthsRemaining),
          );

          const annualResult = this.calculatePAYE(
            projectedAnnualGross,
            employeePension,
            nhf,
            relief,
          );

          const estimatedTotalPAYE = annualResult.paye;
          paye = Decimal.max(
            estimatedTotalPAYE.minus(ytdPAYE).div(monthsRemaining),
            0,
          );
          taxableIncome = annualResult.taxableIncome.div(monthsRemaining);
        }

        const totalDeductions = paye.plus(employeePension).plus(nhf);
        const netSalary = grossSalary.minus(totalDeductions);

        const approvalStatus = multi ? 'pending' : 'approved';
        const approvalDate = multi ? null : new Date().toISOString();
        const approvalRemarks = multi ? null : 'Auto-approved';

        const result = await this.db.transaction(async (trx) => {
          await trx
            .delete(payroll)
            .where(
              and(
                eq(payroll.employeeId, employeeId),
                eq(payroll.payrollDate, payrollDate),
                eq(payroll.companyId, companyId),
                eq(payroll.isOffCycle, true),
              ),
            )
            .execute();

          const [inserted] = await trx
            .insert(payroll)
            .values({
              payrollRunId: runId,
              employeeId,
              companyId,
              basic: '0.00',
              housing: '0.00',
              transport: '0.00',
              grossSalary: grossSalary.toFixed(2),
              pensionContribution: employeePension.toFixed(2),
              employerPensionContribution: employerPension.toFixed(2),
              bonuses: '0.00',
              nhfContribution: nhf.toFixed(2),
              payeTax: paye.toFixed(2),
              customDeductions: '0.00',
              totalDeductions: totalDeductions.toFixed(2),
              taxableIncome: taxableIncome.toFixed(2),
              netSalary: netSalary.toFixed(2),
              salaryAdvance: '0.00',
              payrollDate,
              payrollMonth,
              approvalStatus,
              approvalDate,
              approvalRemarks,
              requestedBy: userId,
              workflowId,
              currentStep: multi ? 0 : 1,
              isStarter: false,
              isOffCycle: true,
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

          await trx.insert(payrollYtd).values({
            employeeId,
            payrollMonth,
            payrollDate,
            payrollId: inserted.id,
            companyId,
            year: new Date().getFullYear(),
            grossSalary: grossSalary.toFixed(2),
            netSalary: netSalary.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            bonuses: '0.00',
            PAYE: paye.toFixed(2),
            pension: employeePension.toFixed(2),
            employerPension: employerPension.toFixed(2),
            nhf: nhf.toFixed(2),
            basic: '0.00',
            housing: '0.00',
            transport: '0.00',
          });

          return {
            ...inserted,
            name: `${emp.firstName} ${emp.lastName}`,
          };
        });

        return result;
      }),
    );

    return results;
  }

  // Public method
  async calculateAndPersistOffCycle(
    runId: string,
    user: User,
    payrollDate: string,
  ) {
    // 3. Load payroll settings
    const payrollSettings =
      await this.payrollSettingsService.getAllPayrollSettings(user.companyId);
    const multi = payrollSettings.multi_level_approval;
    const chain = payrollSettings.approver_chain || '[]';

    const payrollRunId = runId;

    // 5. Create or fetch approvalWorkflow
    let [workflow] = await this.db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.companyId, user.companyId),
          eq(approvalWorkflows.entityId, payrollRunId),
        ),
      )
      .execute();

    if (!workflow) {
      [workflow] = await this.db
        .insert(approvalWorkflows)
        .values({
          name: 'Payroll Run',
          companyId: user.companyId,
          entityId: payrollRunId,
          entityDate: new Date(payrollDate).toISOString().split('T')[0], // 'YYYY-MM-DD'
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
        .values({
          payrollRunId,
          stepId: createdSteps[0].id,
          actorId: user.id,
          action: 'pending',
          remarks: 'Pending approval',
          createdAt: new Date(),
        })
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

    return this.calculateOffCyclePayroll(
      runId,
      user.companyId,
      user.id,
      workflowId,
    );
  }

  async create(createOffCycleDto: CreateOffCycleDto, user: User) {
    // check if there is an office payroll run in progress
    const inProgressPayroll = await this.db
      .select()
      .from(offCyclePayroll)
      .where(
        and(
          eq(offCyclePayroll.companyId, user.companyId),
          eq(offCyclePayroll.payrollDate, createOffCycleDto.payrollDate),
        ),
      );

    const payrollRunId = inProgressPayroll.length
      ? inProgressPayroll[0].payrollRunId
      : uuidv4();

    // Check if the employee exists already added for same payroll date
    const existingOffCycle = await this.db
      .select()
      .from(offCyclePayroll)
      .where(
        and(
          eq(offCyclePayroll.companyId, user.companyId),
          eq(offCyclePayroll.employeeId, createOffCycleDto.employeeId),
          eq(
            offCyclePayroll.payrollDate,
            new Date(createOffCycleDto.payrollDate).toDateString(),
          ),
          eq(offCyclePayroll.type, createOffCycleDto.type),
        ),
      )
      .limit(1);

    if (existingOffCycle.length > 0) {
      throw new BadRequestException(
        `Off-cycle payroll already exists for employee ${createOffCycleDto.employeeId} on ${createOffCycleDto.payrollDate}`,
      );
    }

    const [created] = await this.db
      .insert(offCyclePayroll)
      .values({
        payrollRunId,
        companyId: user.companyId,
        employeeId: createOffCycleDto.employeeId,
        payrollDate: createOffCycleDto.payrollDate,
        type: createOffCycleDto.type,
        amount: createOffCycleDto.amount,
        taxable: createOffCycleDto.taxable ?? true,
        proratable: createOffCycleDto.proratable ?? false,
        notes: createOffCycleDto.notes,
      })
      .returning()
      .execute();

    // Audit the creation
    await this.auditService.logAction({
      action: 'create',
      entity: 'offCycle',
      entityId: created.id,
      details: 'Created new off-cycle payroll entry',
      userId: user.id,
      changes: {
        employeeId: created.employeeId,
        payrollDate: createOffCycleDto.payrollDate,
        type: createOffCycleDto.type,
        amount: createOffCycleDto.amount,
        taxable: createOffCycleDto.taxable,
        proratable: createOffCycleDto.proratable,
      },
    });

    return this.findAll(user.companyId, created.payrollDate);
  }

  findAll(companyId: string, payrollDate: string) {
    return this.db
      .select({
        id: offCyclePayroll.id,
        employeeId: offCyclePayroll.employeeId,
        type: offCyclePayroll.type,
        amount: offCyclePayroll.amount,
        taxable: offCyclePayroll.taxable,
        proratable: offCyclePayroll.proratable,
        payrollDate: offCyclePayroll.payrollDate,
        notes: offCyclePayroll.notes,
        payrollRunId: offCyclePayroll.payrollRunId,
        name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(offCyclePayroll)
      .innerJoin(employees, eq(offCyclePayroll.employeeId, employees.id))
      .where(
        and(
          eq(offCyclePayroll.companyId, companyId),
          eq(offCyclePayroll.payrollDate, payrollDate),
        ),
      );
  }

  async findOne(id: string) {
    const [offCycle] = await this.db
      .select()
      .from(offCyclePayroll)
      .where(eq(offCyclePayroll.id, id))
      .limit(1);

    if (!offCycle) {
      throw new BadRequestException(`Off-cycle payroll not found`);
    }
    return offCycle;
  }

  // update(id: number, updateOffCycleDto: UpdateOffCycleDto) {
  //   return `This action updates a #${id} offCycle`;
  // }

  async remove(id: string, user: User) {
    // Check if the off-cycle payroll entry exists
    const offCycle = await this.findOne(id);

    const deleted = await this.db
      .delete(offCyclePayroll)
      .where(eq(offCyclePayroll.id, id))
      .execute();

    // delete the entry from the payroll table
    await this.db
      .delete(payroll)
      .where(
        and(
          eq(payroll.payrollRunId, offCycle.payrollRunId),
          eq(payroll.isOffCycle, true),
        ),
      )
      .execute();

    // Audit the deletion
    await this.auditService.logAction({
      action: 'delete',
      entity: 'offCycle',
      entityId: id,
      details: 'Deleted off-cycle payroll entry',
      userId: user.id,
      changes: {
        id,
        deleted: deleted.rowCount > 0,
      },
    });
  }
}
