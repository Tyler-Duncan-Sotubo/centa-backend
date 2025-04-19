import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/config/cache/cache.service';
import { LoanRequestDto, UpdateLoanStatusDto } from '../dto/create-loan.dto';
import { PusherService } from 'src/notification/services/pusher.service';
import { PushNotificationService } from 'src/notification/services/push-notification.service';
export declare class LoanService {
    private db;
    private readonly cache;
    private readonly pusher;
    private readonly pushNotificationService;
    constructor(db: db, cache: CacheService, pusher: PusherService, pushNotificationService: PushNotificationService);
    private getEmployee;
    getUnpaidAdvanceDeductions(employee_id: string): Promise<{
        loanId: string;
        monthlyDeduction: number | null;
    }[]>;
    salaryAdvanceRequest(dto: LoanRequestDto, employee_id: string): Promise<{
        id: string;
        name: string;
        company_id: string;
        employee_id: string;
        createdAt: Date;
        amount: number;
        total_paid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
        status: string;
        payment_status: string;
    }>;
    getAdvances(company_id: string): Promise<{
        name: string;
        loanId: string;
        amount: number;
        status: string;
        totalPaid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
        employeeName: unknown;
        outstandingBalance: number;
    }[]>;
    getAdvancesByEmployee(employee_id: string): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        name: string;
        amount: number;
        total_paid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
        status: string;
        payment_status: string;
        createdAt: Date;
    }[]>;
    getAdvanceById(loan_id: string): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        name: string;
        amount: number;
        total_paid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
        status: string;
        payment_status: string;
        createdAt: Date;
    }>;
    updateAdvanceStatus(loan_id: string, dto: UpdateLoanStatusDto, user_id: string): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        name: string;
        amount: number;
        total_paid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
        status: string;
        payment_status: string;
        createdAt: Date;
    }>;
    deleteAdvance(loan_id: string): Promise<any>;
    repayAdvance(loan_id: string, amount: number): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: number;
        paidAt: Date;
    }>;
    getAdvancesAndRepaymentsByEmployee(employee_id: string): Promise<{
        loanId: string;
        amount: number;
        status: string;
        totalPaid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
        name: string;
        paymentStatus: string;
        outstandingBalance: number;
    }[]>;
    getRepaymentByLoan(loan_id: string): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: number;
        paidAt: Date;
    }>;
    getAdvanceHistoryByEmployee(employee_id: string): Promise<{
        salary_advance: {
            id: string;
            company_id: string;
            employee_id: string;
            name: string;
            amount: number;
            total_paid: number;
            tenureMonths: number;
            preferredMonthlyPayment: number | null;
            status: string;
            payment_status: string;
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
