import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { CreateSalaryAdvanceDto, UpdateLoanStatusDto } from './dto/create-salary-advance.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { PayrollSettingsService } from '../settings/payroll-settings.service';
import { User } from 'src/common/types/user.type';
import { PusherService } from 'src/modules/notification/services/pusher.service';
export declare class SalaryAdvanceService {
    private db;
    private readonly cache;
    private readonly auditService;
    private readonly payrollSettingsService;
    private readonly pusher;
    constructor(db: db, cache: CacheService, auditService: AuditService, payrollSettingsService: PayrollSettingsService, pusher: PusherService);
    createLoanNumber(companyId: string): Promise<string>;
    private getEmployee;
    getUnpaidAdvanceDeductions(employee_id: string): Promise<{
        loanId: string;
        monthlyDeduction: string | null;
    }[]>;
    salaryAdvanceRequest(dto: CreateSalaryAdvanceDto, employee_id: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        companyId: string;
        employeeId: string;
        paymentStatus: string;
        loanNumber: string | null;
        amount: string;
        totalPaid: string;
        tenureMonths: number;
        preferredMonthlyPayment: string | null;
        status: string;
    }>;
    getAdvances(company_id: string): Promise<({
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
    getAdvancesByEmployee(employee_id: string): Promise<{
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
    }[]>;
    getAdvanceById(loan_id: string): Promise<{
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
    updateAdvanceStatus(loan_id: string, dto: UpdateLoanStatusDto, user_id: string): Promise<{
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
    repayAdvance(loan_id: string, amount: number): Promise<{
        id: string;
        salaryAdvanceId: string;
        amountPaid: string;
        paidAt: Date;
    } | undefined>;
    getAdvancesAndRepaymentsByEmployee(employee_id: string): Promise<{
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
    getRepaymentByLoan(loan_id: string): Promise<{
        id: string;
        salaryAdvanceId: string;
        amountPaid: string;
        paidAt: Date;
    }>;
    getAdvanceHistoryByEmployee(employee_id: string): Promise<{
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
    getAdvancesHistoryByCompany(company_id: string): Promise<({
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
}
