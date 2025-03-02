import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/config/cache/cache.service';
import { LoanRequestDto, UpdateLoanStatusDto } from '../dto/create-loan.dto';
import { PusherService } from 'src/notification/services/pusher.service';
export declare class LoanService {
    private db;
    private readonly cache;
    private readonly pusher;
    constructor(db: db, cache: CacheService, pusher: PusherService);
    private getEmployee;
    getUnpaidAdvanceDeductions(employee_id: string): Promise<{
        loanId: string;
        monthlyDeduction: number;
    }[]>;
    salaryAdvanceRequest(dto: LoanRequestDto, employee_id: string): Promise<{
        id: string;
        company_id: string;
        createdAt: Date;
        employee_id: string;
        amount: string;
        total_paid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
    }>;
    getAdvances(company_id: string): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        employeeName: unknown;
    }[]>;
    getAdvancesByEmployee(employee_id: string): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        amount: string;
        total_paid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    getAdvanceById(loan_id: string): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        amount: string;
        total_paid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
        createdAt: Date;
    }>;
    updateAdvanceStatus(loan_id: string, dto: UpdateLoanStatusDto, user_id: string): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        amount: string;
        total_paid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
        createdAt: Date;
    }>;
    deleteAdvance(loan_id: string): Promise<any>;
    repayAdvance(loan_id: string, amount: string): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: string;
        paidAt: Date;
    }>;
    getAdvancesAndRepaymentsByEmployee(employee_id: string): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        outstandingBalance: number;
    }[]>;
    getRepaymentByLoan(loan_id: string): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: string;
        paidAt: Date;
    }>;
    getAdvanceHistoryByEmployee(employee_id: string): Promise<{
        salary_advance: {
            id: string;
            company_id: string;
            employee_id: string;
            amount: string;
            total_paid: string;
            tenureMonths: number;
            preferredMonthlyPayment: string | null;
            status: string;
            createdAt: Date;
        };
        salary_advance_history: {
            id: string;
            company_id: string;
            salaryAdvance_id: string;
            action: string;
            reason: string | null;
            action_by: string | null;
            created_at: Date;
        };
    }[]>;
    getAdvancesHistoryByCompany(company_id: string): Promise<{
        action: string;
        reason: string | null;
        actionBy: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        createdAt: Date;
        employee: unknown;
    }[]>;
}
