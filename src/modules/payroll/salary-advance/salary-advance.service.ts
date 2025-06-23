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
    // --- 1) Sequence logic for employeeNumber (as before) ---
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

    const empNum = `LOAN-${String(seq).padStart(3, '0')}`; // Format as LOAN001, LOAN002, etc.
    return empNum;
  }

  // Get Employee
  private async getEmployee(employee_id: string) {
    const cacheKey = `employee:${employee_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const employee = await this.db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          companyId: employees.companyId,
        })
        .from(employees)
        .where(eq(employees.id, employee_id))
        .execute();

      return employee[0];
    });
  }

  async getUnpaidAdvanceDeductions(employee_id: string) {
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

    return newLoan;
  }

  // Get Loans by Company
  async getAdvances(company_id: string) {
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
  }

  // Get Loans by Employee
  async getAdvancesByEmployee(employee_id: string) {
    const allLoans = await this.db
      .select()
      .from(salaryAdvance)
      .where(eq(salaryAdvance.employeeId, employee_id))
      .execute();

    return allLoans;
  }

  // Get Loan by ID
  async getAdvanceById(loan_id: string) {
    const loan = await this.db
      .select()
      .from(salaryAdvance)
      .where(eq(salaryAdvance.id, loan_id))
      .execute();

    return loan[0];
  }

  // Update Loan Status
  async updateAdvanceStatus(
    loan_id: string,
    dto: UpdateLoanStatusDto,
    user_id: string,
  ) {
    // Fetch the existing loan
    const loan = await this.db
      .select()
      .from(salaryAdvance)
      .where(eq(salaryAdvance.id, loan_id))
      .execute();

    if (!loan.length) {
      throw new BadRequestException('Loan not found');
    }

    // Use transaction to ensure atomicity
    const updatedLoan = await this.db.transaction(async (tx) => {
      // Update loan status
      const [updated] = await tx
        .update(salaryAdvance)
        .set({ ...dto })
        .where(eq(salaryAdvance.id, loan_id))
        .returning(); // Return updated loan

      // Insert into loan history
      await tx.insert(salaryAdvanceHistory).values({
        salaryAdvanceId: loan_id,
        companyId: updated.companyId,
        action: dto.status, // "approved", "rejected", etc.
        reason: dto.reason || null, // Optional reason
        actionBy: user_id, // Admin who performed the update
        createdAt: new Date(),
      });

      await this.pusher.createNotification(
        loan[0].companyId,
        `New loan request updated to ${updated.status}`,
        'loan',
      );

      await this.pusher.createEmployeeNotification(
        loan[0].companyId,
        loan[0].employeeId,
        `Your loan request ${loan[0].loanNumber} has been ${updated.status}`,
        'loan',
      );

      // Audit log
      await this.auditService.logAction({
        action: 'update',
        entity: 'salary_advance',
        entityId: loan_id,
        userId: user_id,
        details: `Loan status updated to ${dto.status} by user ${user_id}`,
        changes: {
          status: { before: loan[0].status, after: dto.status },
          reason: { before: null, after: dto.reason },
        },
      });

      return updated;
    });

    return updatedLoan;
  }

  // Repayments ---------------------------------------------
  async repayAdvance(loan_id: string, amount: number) {
    const loan = await this.getAdvanceById(loan_id);

    if (!loan) {
      throw new BadRequestException('Loan not found');
    }

    // Convert values to Decimal
    const loanAmount = new Decimal(loan.amount);
    const previousTotalPaid = new Decimal(loan.totalPaid || 0);
    const repaymentAmount = new Decimal(amount);
    const newTotalPaid = previousTotalPaid.plus(repaymentAmount);

    // Prevent overpayment
    if (newTotalPaid.gt(loanAmount)) {
      return;
    } else {
      const newRepayment = await this.db.transaction(async (tx) => {
        // 1. Insert repayment record
        const [repayment] = await tx
          .insert(repayments)
          .values({
            salaryAdvanceId: loan_id,
            amountPaid: repaymentAmount.toFixed(2), // precise decimal
          })
          .returning();

        // 2. Update loan record
        await tx
          .update(salaryAdvance)
          .set({
            totalPaid: newTotalPaid.toFixed(2),
            status: newTotalPaid.eq(loanAmount) ? 'paid' : loan.status,
            paymentStatus: newTotalPaid.eq(loanAmount) ? 'closed' : loan.status,
          })
          .where(eq(salaryAdvance.id, loan_id))
          .execute();

        // 3. Audit history
        await tx.insert(salaryAdvanceHistory).values({
          salaryAdvanceId: loan_id,
          companyId: loan.companyId,
          action: 'repayment',
          reason: `Paid ₦${repaymentAmount.toFixed(2)}`,
          createdAt: new Date(),
        });

        return repayment;
      });
      return newRepayment;
    }

    // Proceed with transactional update
  }

  async getAdvancesAndRepaymentsByEmployee(employee_id: string) {
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
      .where(eq(salaryAdvance.employeeId, employee_id)) // Filter by employee
      .execute();

    return loansWithRepayments;
  }

  // Get Repayments by Loan
  async getRepaymentByLoan(loan_id: string) {
    const repayment = await this.db
      .select()
      .from(repayments)
      .where(eq(repayments.salaryAdvanceId, loan_id))
      .execute();

    return repayment[0];
  }

  // Loan History ---------------------------------------------

  // Get Loan History by Employee
  async getAdvanceHistoryByEmployee(employee_id: string) {
    return await this.db
      .select()
      .from(salaryAdvanceHistory)
      .innerJoin(
        salaryAdvance,
        eq(salaryAdvanceHistory.salaryAdvanceId, salaryAdvance.id),
      )
      .where(eq(salaryAdvance.employeeId, employee_id))
      .execute();
  }

  // Get Loan History by Company
  async getAdvancesHistoryByCompany(company_id: string) {
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
      .limit(10) // Limit to 10 records
      .orderBy(desc(salaryAdvanceHistory.createdAt)) // Order by created_at in descending order
      .execute();

    return history;
  }
}
