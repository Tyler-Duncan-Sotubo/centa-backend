import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq, and, sql, desc, not } from 'drizzle-orm';
import { employees } from 'src/drizzle/schema/employee.schema';
import {
  salaryAdvance,
  repayments,
  salaryAdvanceHistory,
} from 'src/drizzle/schema/loans.schema';
import { CacheService } from 'src/config/cache/cache.service';
import { LoanRequestDto, UpdateLoanStatusDto } from '../dto/create-loan.dto';
import { users } from 'src/drizzle/schema/users.schema';
import { PusherService } from 'src/notification/services/pusher.service';

@Injectable()
export class LoanService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
    private readonly pusher: PusherService,
  ) {}

  // Get Employee
  private async getEmployee(employee_id: string) {
    const cacheKey = `employee:${employee_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const employee = await this.db
        .select()
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
        monthlyDeduction: sql<number>`
        (${salaryAdvance.amount} - ${salaryAdvance.total_paid}) / 
        GREATEST(${salaryAdvance.tenureMonths} - DATE_PART('month', AGE(NOW(), ${salaryAdvance.createdAt})), 1)
      `.as('monthlyDeduction'),
      })
      .from(salaryAdvance)
      .where(
        and(
          eq(salaryAdvance.employee_id, employee_id),
          not(eq(salaryAdvance.status, 'paid')),
        ),
      )
      .limit(1)
      .execute();
  }

  // Loan Request
  async salaryAdvanceRequest(dto: LoanRequestDto, employee_id: string) {
    const employee = await this.getEmployee(employee_id);

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    // Check if loan name already exists for this employee
    const existingLoan = await this.db
      .select()
      .from(salaryAdvance)
      .where(
        and(
          eq(salaryAdvance.employee_id, employee_id),
          not(eq(salaryAdvance.status, 'paid')),
        ),
      )
      .execute();

    if (existingLoan.length > 0) {
      throw new BadRequestException('The Employee already has an active loan');
    }

    // Use transaction to ensure consistency
    const newLoan = await this.db.transaction(async (tx) => {
      // Insert new loan
      const [loan] = await tx
        .insert(salaryAdvance)
        .values({
          employee_id: employee_id,
          company_id: employee.company_id,
          amount: dto.amount,
          status: 'pending',
          tenureMonths: dto.tenureMonths,
          preferredMonthlyPayment: dto.preferredMonthlyPayment,
        })
        .returning(); // Ensure we return the created loan

      // Insert into loan history
      await tx.insert(salaryAdvanceHistory).values({
        salaryAdvance_id: loan.id,
        company_id: employee.company_id,
        action: 'requested',
      });

      // Broadcast notification
      await this.pusher.createNotification(
        employee.company_id,
        `New loan request from ${employee.first_name} ${employee.last_name}`,
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
        loanId: salaryAdvance.id,
        amount: salaryAdvance.amount,
        status: salaryAdvance.status,
        totalPaid: salaryAdvance.total_paid,
        tenureMonths: salaryAdvance.tenureMonths,
        preferredMonthlyPayment: salaryAdvance.preferredMonthlyPayment,
        employeeName: sql`${employees.first_name} || ' ' || ${employees.last_name}`,
      })
      .from(salaryAdvance)
      .innerJoin(employees, eq(salaryAdvance.employee_id, employees.id))
      .where(eq(salaryAdvance.company_id, company_id))
      .execute();

    return allLoans;
  }

  // Get Loans by Employee
  async getAdvancesByEmployee(employee_id: string) {
    const allLoans = await this.db
      .select()
      .from(salaryAdvance)
      .where(eq(salaryAdvance.employee_id, employee_id))
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
        salaryAdvance_id: loan_id,
        company_id: updated.company_id,
        action: dto.status, // "approved", "rejected", etc.
        reason: dto.reason || null, // Optional reason
        action_by: user_id, // Admin who performed the update
        created_at: new Date(),
      });

      await this.pusher.createNotification(
        loan[0].company_id,
        `New loan request updated to ${updated.status}`,
        'loan',
      );

      return updated;
    });

    return updatedLoan;
  }

  //Delete Loan
  async deleteAdvance(loan_id: string) {
    const loan = await this.db
      .delete(salaryAdvance)
      .where(eq(salaryAdvance.id, loan_id))
      .execute();

    return loan;
  }

  // Repayments ---------------------------------------------
  async repayAdvance(loan_id: string, amount: string) {
    const loan = await this.getAdvanceById(loan_id);

    if (!loan) {
      throw new BadRequestException('Loan not found');
    }

    // Convert values to numbers for accurate calculations
    const loanAmount = parseFloat(loan.amount);
    const previousTotalPaid = parseFloat(loan.total_paid || '0');
    const repaymentAmount = parseFloat(amount);
    const newTotalPaid = previousTotalPaid + repaymentAmount;

    // Prevent overpayment
    if (newTotalPaid > loanAmount) {
      throw new BadRequestException('Repayment exceeds the loan amount');
    }

    // Use transaction for consistency
    const newRepayment = await this.db.transaction(async (tx) => {
      // Insert repayment record
      const [repayment] = await tx
        .insert(repayments)
        .values({
          salary_advance_id: loan_id,
          amount_paid: amount,
        })
        .returning();

      // Update totalPaid and loan status in loans table
      await tx
        .update(salaryAdvance)
        .set({
          total_paid: newTotalPaid.toString(), // Store new total paid
          status: newTotalPaid === loanAmount ? 'paid' : loan.status, // Mark as paid if fully repaid
        })
        .where(eq(salaryAdvance.id, loan_id))
        .execute();

      // Insert repayment action into loan history
      await tx.insert(salaryAdvanceHistory).values({
        salaryAdvance_id: loan_id,
        company_id: loan.company_id,
        action: 'repayment',
        reason: `Paid ${amount}`,
        created_at: new Date(),
      });

      return repayment;
    });

    return newRepayment;
  }

  async getAdvancesAndRepaymentsByEmployee(employee_id: string) {
    const loansWithRepayments = await this.db
      .select({
        loanId: salaryAdvance.id,
        amount: salaryAdvance.amount,
        status: salaryAdvance.status,
        totalPaid: salaryAdvance.total_paid,
        outstandingBalance:
          sql<number>`(${salaryAdvance.amount} - ${salaryAdvance.total_paid})`.as(
            'outstandingBalance',
          ),
      })
      .from(salaryAdvance)
      .where(eq(salaryAdvance.employee_id, employee_id)) // Filter by employee
      .execute();

    return loansWithRepayments;
  }

  // Get Repayments by Loan
  async getRepaymentByLoan(loan_id: string) {
    const repayment = await this.db
      .select()
      .from(repayments)
      .where(eq(repayments.salary_advance_id, loan_id))
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
        eq(salaryAdvanceHistory.salaryAdvance_id, salaryAdvance.id),
      )
      .where(eq(salaryAdvance.employee_id, employee_id))
      .execute();
  }

  // Get Loan History by Company
  async getAdvancesHistoryByCompany(company_id: string) {
    const history = await this.db
      .select({
        action: salaryAdvanceHistory.action,
        reason: salaryAdvanceHistory.reason,
        actionBy: users.role,
        createdAt: salaryAdvanceHistory.created_at,
        employee:
          sql`${employees.first_name} || ' ' || ${employees.last_name}`.as(
            'employee',
          ),
      })
      .from(salaryAdvanceHistory) // Define main table
      .innerJoin(
        salaryAdvance,
        eq(salaryAdvanceHistory.salaryAdvance_id, salaryAdvance.id),
      )
      .innerJoin(employees, eq(salaryAdvance.employee_id, employees.id))
      .innerJoin(users, eq(salaryAdvanceHistory.action_by, users.id))
      .where(eq(salaryAdvanceHistory.company_id, company_id))
      .limit(10) // Limit to 10 records
      .orderBy(desc(salaryAdvanceHistory.created_at)) // Order by created_at in descending order
      .execute();

    return history;
  }
}
