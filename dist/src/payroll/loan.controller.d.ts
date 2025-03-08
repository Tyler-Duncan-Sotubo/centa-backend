import { BaseController } from 'src/config/base.controller';
import { LoanService } from './services/loan.service';
import { User } from 'src/types/user.type';
import { LoanRequestDto, UpdateLoanStatusDto } from './dto/create-loan.dto';
export declare class LoanController extends BaseController {
    private readonly loanService;
    constructor(loanService: LoanService);
    requestLoan(employee_id: string, dto: LoanRequestDto): Promise<{
        id: string;
        company_id: string;
        employee_id: string;
        createdAt: Date;
        amount: string;
        total_paid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
    }>;
    getLoans(user: User): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        employeeName: unknown;
    }[]>;
    getLoansByEmployee(employee_id: string): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        outstandingBalance: number;
    }[]>;
    getLoanById(loan_id: string): Promise<{
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
    updateLoanStatus(loan_id: string, dto: UpdateLoanStatusDto, user: User): Promise<{
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
    deleteLoan(loan_id: string): Promise<any>;
    repayLoan(loan_id: string, amount: string): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: string;
        paidAt: Date;
    }>;
    getRepaymentsByEmployee(employee_id: string): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        outstandingBalance: number;
    }[]>;
    getRepaymentsByLoan(loan_id: string): Promise<{
        id: string;
        salary_advance_id: string;
        amount_paid: string;
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
}
