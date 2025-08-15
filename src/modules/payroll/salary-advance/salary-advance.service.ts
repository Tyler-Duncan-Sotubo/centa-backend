import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql, desc, not } from 'drizzle-orm';
import { companyRoles, employees, users } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  repayments,
  salaryAdvance,
  salaryAdvanceHistory,
} from './schema/salary-advance.schema';
import {
  CreateSalaryAdvanceDto,
  UpdateLoanStatusDto,
} from './dto/create-salary-advance.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { PayrollSettingsService } from '../settings/payroll-settings.service';
import { User } from 'src/common/types/user.type';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import { employeeCompensations } from 'src/modules/core/employees/schema/compensation.schema';
import Decimal from 'decimal.js';
import { loanSequences } from './schema/loan_sequences.schema';

@Injectable()
export class SalaryAdvanceService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly payrollSettingsService: PayrollSettingsService,
    private readonly pusher: PusherService,
  ) {}

  async createLoanNumber(companyId: string) {
    const [seqRow] = await this.db
      .select({ next: loanSequences.nextNumber })
      .from(loanSequences)
      .where(eq(loanSequences.companyId, companyId))
      .execute();

    let seq = 1;
    if (!seqRow) {
      await this.db
        .insert(loanSequences)
        .values({ companyId, nextNumber: 2 })
        .execute();
    } else {
      seq = seqRow.next;
      await this.db
        .update(loanSequences)
        .set({ nextNumber: seq + 1 })
        .where(eq(loanSequences.companyId, companyId))
        .execute();
    }

    return `LOAN-${String(seq).padStart(3, '0')}`;
  }

  // Small helper to fetch companyId for an employee (for versioned cache keys)
  private async getEmployeeCompanyId(employeeId: string): Promise<string> {
    const [row] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .execute();
    if (!row) throw new BadRequestException('Employee not found');
    return row.companyId;
  }

  // Get Employee (versioned cache)
  private async getEmployee(employee_id: string) {
    const companyId = await this.getEmployeeCompanyId(employee_id);

    return this.cache.getOrSetVersioned(
      companyId,
      ['employees', 'byId', employee_id],
      async () => {
        const [employee] = await this.db
          .select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            companyId: employees.companyId,
          })
          .from(employees)
          .where(eq(employees.id, employee_id))
          .execute();

        if (!employee) throw new BadRequestException('Employee not found');
        return employee;
      },
      {
        tags: [
          'employees',
          `company:${companyId}:employees`,
          `employee:${employee_id}`,
        ],
      },
    );
  }

  // Unpaid advance deductions (versioned cache)
  async getUnpaidAdvanceDeductions(employee_id: string) {
    const companyId = await this.getEmployeeCompanyId(employee_id);

    return this.cache.getOrSetVersioned(
      companyId,
      ['loans', 'unpaidDeduction', employee_id],
      async () => {
        return await this.db
          .select({
            loanId: salaryAdvance.id,
            monthlyDeduction: salaryAdvance.preferredMonthlyPayment,
          })
          .from(salaryAdvance)
          .where(
            and(
              eq(salaryAdvance.employeeId, employee_id),
              eq(salaryAdvance.status, 'approved'),
              not(eq(salaryAdvance.status, 'paid')),
            ),
          )
          .limit(1)
          .execute();
      },
      {
        tags: [
          'loans',
          `company:${companyId}:loans`,
          `employee:${employee_id}:loans`,
        ],
      },
    );
  }

  // Loan Request
  async salaryAdvanceRequest(
    dto: CreateSalaryAdvanceDto,
    employee_id: string,
    user: User,
  ) {
    const employee = await this.getEmployee(employee_id);

    const [employeeCompensation] = await this.db
      .select()
      .from(employeeCompensations)
      .where(eq(employeeCompensations.employeeId, employee.id))
      .execute();

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    const settings = await this.payrollSettingsService.getLoanSettings(
      user.companyId,
    );

    if (!settings.useLoan) {
      throw new BadRequestException(
        'Salary advance is not enabled for this company',
      );
    }

    const requestedAmount = new Decimal(dto.amount);
    const minAmount = new Decimal(settings.minAmount);
    const maxAmount = new Decimal(settings.maxAmount);

    if (requestedAmount.lt(minAmount)) {
      throw new BadRequestException(
        `Requested amount is below the minimum allowed: ₦${minAmount.toFixed(2)}`,
      );
    }

    if (requestedAmount.gt(maxAmount)) {
      throw new BadRequestException(
        `Requested amount exceeds the maximum allowed: ₦${maxAmount.toFixed(2)}`,
      );
    }

    const maxFromSalary = new Decimal(employeeCompensation.grossSalary).mul(
      settings.maxPercentOfSalary || 1,
    );
    if (requestedAmount.gt(maxFromSalary)) {
      throw new BadRequestException(
        'Requested amount exceeds max allowed based on salary',
      );
    }

    const existingLoan = await this.db
      .select()
      .from(salaryAdvance)
      .where(
        and(
          eq(salaryAdvance.employeeId, employee_id),
          not(eq(salaryAdvance.status, 'paid')),
        ),
      )
      .execute();

    if (existingLoan.length > 0) {
      throw new BadRequestException('The employee already has an active loan');
    }

    const newLoan = await this.db.transaction(async (tx) => {
      const nextLoanNumber = await this.createLoanNumber(employee.companyId);
      const [loan] = await tx
        .insert(salaryAdvance)
        .values({
          name: dto.name,
          employeeId: employee_id,
          companyId: employee.companyId,
          amount: requestedAmount.toFixed(2),
          status: 'pending',
          tenureMonths: dto.tenureMonths,
          preferredMonthlyPayment: new Decimal(
            dto.preferredMonthlyPayment || 0,
          ).toFixed(2),
          loanNumber: nextLoanNumber,
        })
        .returning();

      await tx.insert(salaryAdvanceHistory).values({
        salaryAdvanceId: loan.id,
        companyId: employee.companyId,
        action: 'requested',
      });

      await this.auditService.logAction({
        action: 'create',
        entity: 'salary_advance',
        entityId: loan.id,
        userId: user.id,
        details: `Requested a loan of ₦${requestedAmount.toFixed(2)} for ${dto.tenureMonths} months`,
        changes: {
          amount: { before: null, after: requestedAmount.toFixed(2) },
          tenureMonths: { before: null, after: dto.tenureMonths },
          preferredMonthlyPayment: {
            before: null,
            after: dto.preferredMonthlyPayment,
          },
        },
      });

      await this.pusher.createNotification(
        employee.companyId,
        `New loan request from ${employee.firstName} ${employee.lastName}`,
        'loan',
      );

      return loan;
    });

    // bump & invalidate caches related to loans
    await this.cache.bumpCompanyVersion(employee.companyId);
    await this.cache.invalidateTags([
      'loans',
      `company:${employee.companyId}:loans`,
      `employee:${employee_id}:loans`,
      `loan:${newLoan.id}`,
      'employees', // some screens show embedded employee+loan lists
    ]);

    return newLoan;
  }

  // Get Loans by Company (versioned)
  async getAdvances(company_id: string) {
    return this.cache.getOrSetVersioned(
      company_id,
      ['loans', 'byCompany'],
      async () => {
        const allLoans = await this.db
          .select({
            name: salaryAdvance.name,
            loanId: salaryAdvance.id,
            amount: salaryAdvance.amount,
            status: salaryAdvance.status,
            totalPaid: salaryAdvance.totalPaid,
            tenureMonths: salaryAdvance.tenureMonths,
            preferredMonthlyPayment: salaryAdvance.preferredMonthlyPayment,
            employeeName: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
            outstandingBalance:
              sql<number>`(${salaryAdvance.amount} - ${salaryAdvance.totalPaid})`.as(
                'outstandingBalance',
              ),
            loanNumber: salaryAdvance.loanNumber,
          })
          .from(salaryAdvance)
          .innerJoin(employees, eq(salaryAdvance.employeeId, employees.id))
          .where(eq(salaryAdvance.companyId, company_id))
          .execute();

        return allLoans;
      },
      { tags: ['loans', `company:${company_id}:loans`] },
    );
  }

  // Get Loans by Employee (versioned)
  async getAdvancesByEmployee(employee_id: string) {
    const companyId = await this.getEmployeeCompanyId(employee_id);

    return this.cache.getOrSetVersioned(
      companyId,
      ['loans', 'byEmployee', employee_id],
      async () => {
        return await this.db
          .select()
          .from(salaryAdvance)
          .where(eq(salaryAdvance.employeeId, employee_id))
          .execute();
      },
      {
        tags: [
          'loans',
          `company:${companyId}:loans`,
          `employee:${employee_id}:loans`,
        ],
      },
    );
  }

  // Get Loan by ID (versioned)
  async getAdvanceById(loan_id: string) {
    // fetch minimal to learn company & employee for versioning/tags
    const [meta] = await this.db
      .select({
        companyId: salaryAdvance.companyId,
        employeeId: salaryAdvance.employeeId,
      })
      .from(salaryAdvance)
      .where(eq(salaryAdvance.id, loan_id))
      .execute();

    if (!meta) return undefined;

    return this.cache.getOrSetVersioned(
      meta.companyId,
      ['loans', 'byId', loan_id],
      async () => {
        const [loan] = await this.db
          .select()
          .from(salaryAdvance)
          .where(eq(salaryAdvance.id, loan_id))
          .execute();
        return loan;
      },
      {
        tags: [
          'loans',
          `company:${meta.companyId}:loans`,
          `employee:${meta.employeeId}:loans`,
          `loan:${loan_id}`,
        ],
      },
    );
  }

  // Update Loan Status
  async updateAdvanceStatus(
    loan_id: string,
    dto: UpdateLoanStatusDto,
    user_id: string,
  ) {
    // Fetch the existing loan
    const [loan] = await this.db
      .select()
      .from(salaryAdvance)
      .where(eq(salaryAdvance.id, loan_id))
      .execute();

    if (!loan) {
      throw new BadRequestException('Loan not found');
    }

    const updatedLoan = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(salaryAdvance)
        .set({ ...dto })
        .where(eq(salaryAdvance.id, loan_id))
        .returning();

      await tx.insert(salaryAdvanceHistory).values({
        salaryAdvanceId: loan_id,
        companyId: updated.companyId,
        action: dto.status,
        reason: dto.reason || null,
        actionBy: user_id,
        createdAt: new Date(),
      });

      await this.pusher.createNotification(
        loan.companyId,
        `New loan request updated to ${updated.status}`,
        'loan',
      );

      await this.pusher.createEmployeeNotification(
        loan.companyId,
        loan.employeeId,
        `Your loan request ${loan.loanNumber} has been ${updated.status}`,
        'loan',
      );

      await this.auditService.logAction({
        action: 'update',
        entity: 'salary_advance',
        entityId: loan_id,
        userId: user_id,
        details: `Loan status updated to ${dto.status} by user ${user_id}`,
        changes: {
          status: { before: loan.status, after: dto.status },
          reason: { before: null, after: dto.reason },
        },
      });

      return updated;
    });

    // bump & invalidate caches
    await this.cache.bumpCompanyVersion(loan.companyId);
    await this.cache.invalidateTags([
      'loans',
      `company:${loan.companyId}:loans`,
      `employee:${loan.employeeId}:loans`,
      `loan:${loan_id}`,
    ]);

    return updatedLoan;
  }

  // Repayments ---------------------------------------------
  async repayAdvance(loan_id: string, amount: number) {
    const loan = await this.getAdvanceById(loan_id);
    if (!loan) throw new BadRequestException('Loan not found');

    const loanAmount = new Decimal(loan.amount);
    const previousTotalPaid = new Decimal(loan.totalPaid || 0);
    const repaymentAmount = new Decimal(amount);
    const newTotalPaid = previousTotalPaid.plus(repaymentAmount);

    if (newTotalPaid.gt(loanAmount)) {
      return; // silently ignore overpayment for now
    }

    const newRepayment = await this.db.transaction(async (tx) => {
      const [repayment] = await tx
        .insert(repayments)
        .values({
          salaryAdvanceId: loan_id,
          amountPaid: repaymentAmount.toFixed(2),
        })
        .returning();

      await tx
        .update(salaryAdvance)
        .set({
          totalPaid: newTotalPaid.toFixed(2),
          status: newTotalPaid.eq(loanAmount) ? 'paid' : loan.status,
          paymentStatus: newTotalPaid.eq(loanAmount) ? 'closed' : loan.status,
        })
        .where(eq(salaryAdvance.id, loan_id))
        .execute();

      await tx.insert(salaryAdvanceHistory).values({
        salaryAdvanceId: loan_id,
        companyId: loan.companyId,
        action: 'repayment',
        reason: `Paid ₦${repaymentAmount.toFixed(2)}`,
        createdAt: new Date(),
      });

      return repayment;
    });

    // bump & invalidate caches
    await this.cache.bumpCompanyVersion(loan.companyId);
    await this.cache.invalidateTags([
      'loans',
      `company:${loan.companyId}:loans`,
      `employee:${loan.employeeId}:loans`,
      `loan:${loan_id}`,
    ]);

    return newRepayment;
  }

  async getAdvancesAndRepaymentsByEmployee(employee_id: string) {
    const companyId = await this.getEmployeeCompanyId(employee_id);

    return this.cache.getOrSetVersioned(
      companyId,
      ['loans', 'summaryByEmployee', employee_id],
      async () => {
        const loansWithRepayments = await this.db
          .select({
            loanId: salaryAdvance.id,
            amount: salaryAdvance.amount,
            status: salaryAdvance.status,
            totalPaid: salaryAdvance.totalPaid,
            tenureMonths: salaryAdvance.tenureMonths,
            preferredMonthlyPayment: salaryAdvance.preferredMonthlyPayment,
            name: salaryAdvance.name,
            paymentStatus: salaryAdvance.paymentStatus,
            createAt: salaryAdvance.createdAt,
            outstandingBalance:
              sql<number>`(${salaryAdvance.amount} - ${salaryAdvance.totalPaid})`.as(
                'outstandingBalance',
              ),
            loanNumber: salaryAdvance.loanNumber,
          })
          .from(salaryAdvance)
          .where(eq(salaryAdvance.employeeId, employee_id))
          .execute();

        return loansWithRepayments;
      },
      {
        tags: [
          'loans',
          `company:${companyId}:loans`,
          `employee:${employee_id}:loans`,
        ],
      },
    );
  }

  // Get Repayments by Loan (versioned)
  async getRepaymentByLoan(loan_id: string) {
    const loan = await this.getAdvanceById(loan_id);
    if (!loan) return undefined;

    return this.cache.getOrSetVersioned(
      loan.companyId,
      ['loans', 'repaymentsByLoan', loan_id],
      async () => {
        const rep = await this.db
          .select()
          .from(repayments)
          .where(eq(repayments.salaryAdvanceId, loan_id))
          .execute();
        return rep[0];
      },
      { tags: ['loans', `company:${loan.companyId}:loans`, `loan:${loan_id}`] },
    );
  }

  // Loan History ---------------------------------------------

  // Get Loan History by Employee (versioned)
  async getAdvanceHistoryByEmployee(employee_id: string) {
    const companyId = await this.getEmployeeCompanyId(employee_id);

    return this.cache.getOrSetVersioned(
      companyId,
      ['loans', 'historyByEmployee', employee_id],
      async () => {
        return await this.db
          .select()
          .from(salaryAdvanceHistory)
          .innerJoin(
            salaryAdvance,
            eq(salaryAdvanceHistory.salaryAdvanceId, salaryAdvance.id),
          )
          .where(eq(salaryAdvance.employeeId, employee_id))
          .execute();
      },
      {
        tags: [
          'loans',
          `company:${companyId}:loans`,
          `employee:${employee_id}:loans`,
        ],
      },
    );
  }

  // Get Loan History by Company (versioned)
  async getAdvancesHistoryByCompany(company_id: string) {
    return this.cache.getOrSetVersioned(
      company_id,
      ['loans', 'historyByCompany'],
      async () => {
        const history = await this.db
          .select({
            action: salaryAdvanceHistory.action,
            reason: salaryAdvanceHistory.reason,
            role: companyRoles.name,
            createdAt: salaryAdvanceHistory.createdAt,
            employee:
              sql`${employees.firstName} || ' ' || ${employees.lastName}`.as(
                'employee',
              ),
          })
          .from(salaryAdvanceHistory)
          .innerJoin(users, eq(salaryAdvanceHistory.actionBy, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .innerJoin(
            salaryAdvance,
            eq(salaryAdvanceHistory.salaryAdvanceId, salaryAdvance.id),
          )
          .innerJoin(employees, eq(salaryAdvance.employeeId, employees.id))
          .where(eq(salaryAdvanceHistory.companyId, company_id))
          .limit(10)
          .orderBy(desc(salaryAdvanceHistory.createdAt))
          .execute();

        return history;
      },
      { tags: ['loans', `company:${company_id}:loans`] },
    );
  }
}
