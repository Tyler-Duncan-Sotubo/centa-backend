import { BaseController } from 'src/common/interceptor/base.controller';
import { SalaryAdvanceService } from './salary-advance.service';
import { CreateSalaryAdvanceDto, UpdateLoanStatusDto } from './dto/create-salary-advance.dto';
import { User } from 'src/common/types/user.type';
export declare class SalaryAdvanceController extends BaseController {
    private readonly salaryAdvanceService;
    constructor(salaryAdvanceService: SalaryAdvanceService);
    requestLoan(employeeId: string, dto: CreateSalaryAdvanceDto, user: User): Promise<{
        id: string;
        name: string;
        loanNumber: string | null;
        createdAt: Date;
        companyId: string;
        employeeId: string;
        amount: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
        paymentStatus: string;
    }>;
    getLoans(user: User): Promise<({
        name: string;
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        employeeName: unknown;
        outstandingBalance: number;
        loanNumber: string | null;
    } | {
        name: string;
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        employeeName: unknown;
        outstandingBalance: number;
        loanNumber: string | null;
    })[]>;
    getLoansByEmployee(employeeId: string): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        name: string;
        paymentStatus: string;
        createAt: Date;
        outstandingBalance: number;
        loanNumber: string | null;
    }[]>;
    getLoanById(id: string): Promise<{
        id: string;
        loanNumber: string | null;
        companyId: string;
        employeeId: string;
        name: string;
        amount: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
        paymentStatus: string;
        createdAt: Date;
    } | undefined>;
    updateLoanStatus(id: string, dto: UpdateLoanStatusDto, user: User): Promise<{
        id: string;
        loanNumber: string | null;
        companyId: string;
        employeeId: string;
        name: string;
        amount: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
        paymentStatus: string;
        createdAt: Date;
    }>;
    repayLoan(loan_id: string, amount: number): Promise<{
        id: string;
        salaryAdvanceId: string;
        amountPaid: string;
        paidAt: Date;
    } | undefined>;
    getRepaymentsByEmployee(employeeId: string): Promise<{
        loanId: string;
        amount: string;
        status: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        name: string;
        paymentStatus: string;
        createAt: Date;
        outstandingBalance: number;
        loanNumber: string | null;
    }[]>;
    getLoanHistoryByCompany(user: User): Promise<({
        action: string;
        reason: string | null;
        role: string;
        createdAt: Date;
        employee: unknown;
    } | {
        action: string;
        reason: string | null;
        role: string;
        createdAt: Date;
        employee: unknown;
    })[]>;
    getLoanHistoryByEmployee(employeeId: string): Promise<{
        salary_advance: {
            id: string;
            loanNumber: string | null;
            companyId: string;
            employeeId: string;
            name: string;
            amount: string;
            totalPaid: string;
            tenureMonths: number;
            preferredMonthlyPayment: string | null;
            status: string;
            paymentStatus: string;
            createdAt: Date;
        };
        salary_advance_history: {
            id: string;
            companyId: string;
            salaryAdvanceId: string;
            action: string;
            reason: string | null;
            actionBy: string | null;
            createdAt: Date;
        };
    }[]>;
}
