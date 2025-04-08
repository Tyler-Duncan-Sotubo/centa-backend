import { BaseController } from 'src/config/base.controller';
import { LoanService } from './services/loan.service';
import { User } from 'src/types/user.type';
import { LoanRequestDto, UpdateLoanStatusDto } from './dto/create-loan.dto';
export declare class LoanController extends BaseController {
    private readonly loanService;
    constructor(loanService: LoanService);
    requestLoan(employee_id: string, dto: LoanRequestDto): Promise<{
        id: string;
        name: string;
        company_id: string;
        employee_id: string;
        createdAt: Date;
        payment_status: string;
        status: string;
        amount: number;
        total_paid: number;
        tenureMonths: number;
        preferredMonthlyPayment: number | null;
    }>;
    getLoans(user: User): Promise<{
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
    getLoansByEmployee(employee_id: string): Promise<{
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
    getLoanById(loan_id: string): Promise<{
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
    updateLoanStatus(loan_id: string, dto: UpdateLoanStatusDto, user: User): Promise<{
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
    deleteLoan(loan_id: string): Promise<any>;
    repayLoan(loan_id: string, amount: number): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: number;
        paidAt: Date;
    }>;
    getRepaymentsByEmployee(employee_id: string): Promise<{
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
    getRepaymentsByLoan(loan_id: string): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: number;
        paidAt: Date;
    }>;
    getLoanHistoryByCompany(user: User): Promise<{
        action: string;
        reason: string | null;
        actionBy: "admin" | "hr_manager" | "employee" | "payroll_specialist" | "super_admin";
        createdAt: Date;
        employee: unknown;
    }[]>;
    getLoanHistoryByEmployee(employee_id: string): Promise<{
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
}
