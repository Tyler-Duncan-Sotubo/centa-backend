import { RunService } from './run.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class RunController extends BaseController {
    private readonly runService;
    constructor(runService: RunService);
    private formattedDate;
    calculatePayrollForCompany(user: User, date: string): Promise<{
        payrollRunId: string;
        payrollDate: string;
        employeeCount: number;
        approvalWorkflowId: string;
    }>;
    getOnePayRun(payRunId: string): Promise<{
        totalCostOfPayroll: any;
        totalPensionContribution: number;
        totalPAYE: number;
        totalNHFContribution: number;
        payrollRunId: string;
        employees: {
            employeeId: string;
            name: string;
            grossSalary: number;
            netSalary: number;
            approvalStatus: string;
            paymentStatus: string | null;
            payeTax: number;
            pensionContribution: number;
            nhfContribution: number;
            employerPensionContribution: number;
            additionalDeductions: number;
            taxableIncome: number;
            salaryAdvance: number;
            payrollMonth: string;
            payrollRunId: string;
            payrollDate: string;
            bonuses: number;
            voluntaryDeductions: unknown;
            payslip_pdf_url: string | null;
            reimbursements: unknown;
        }[];
    }>;
    getPayrollSummary(payRunId: string): Promise<{
        employeeId: string;
        payrollRunId: string;
        payrollDate: string;
        payrollMonth: string;
        name: string;
        isStarter: boolean;
        basic: string;
        housing: string;
        transport: string;
        grossSalary: string;
        netSalary: string;
        bonuses: string | null;
        payeTax: string;
        pensionContribution: string;
        employerPensionContribution: string;
        nhfContribution: string | null;
        totalDeductions: string;
        taxableIncome: string;
        salaryAdvance: string | null;
        reimbursements: {};
        voluntaryDeductions: {};
        approvalStatus: string;
    }[]>;
    sendForApproval(payRunId: string, user: User): Promise<{
        updatedCount: any;
    }>;
    updatePayRun(payRunId: string, user: User, remarks: string): Promise<string>;
    updatePaymentStatus(payRunId: string, user: User): Promise<void>;
    getApprovalStatus(payRunId: string): Promise<{
        payrollDate: string;
        approvalStatus: string;
        approvalSteps: {
            id: string;
            sequence: number;
            role: string;
            minApprovals: number;
            maxApprovals: number;
            createdAt: Date | null;
            status: string;
        }[];
    }>;
    updatePayrollPaymentStatus(user: User, id: string, status: 'paid' | 'pending'): Promise<{
        payrollMonth: string;
        salaryAdvance: string | null;
        employeeId: string;
        expenses: unknown;
    }[]>;
    discardRun(user: User, runId: string): Promise<{
        payrollRunId: string;
        deletedEmployees: number;
        payrollDate: string;
        status: string;
    }>;
}
