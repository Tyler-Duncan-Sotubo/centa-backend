import { OffCycleReportService } from './off-cycle-report.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class OffCycleReportController extends BaseController {
    private readonly offCycleReportService;
    constructor(offCycleReportService: OffCycleReportService);
    getOffCycleSummary(user: User, fromDate: string, toDate: string): Promise<({
        employeeId: string;
        name: string;
        payrollDate: string;
        type: string;
        amount: string;
        taxable: boolean;
    } | {
        employeeId: string;
        name: string;
        payrollDate: string;
        type: string;
        amount: string;
        taxable: boolean;
    })[]>;
    getOffCycleVsRegular(user: User, month: string): Promise<{
        regular: {
            gross: number;
            tax: number;
            net: number;
        };
        offCycle: {
            gross: number;
            tax: number;
            net: number;
        };
        offPercent: number;
    }>;
    getOffCycleByEmployee(user: User, employeeId: string): Promise<{
        payrollDate: string;
        type: string;
        amount: string;
        taxable: boolean;
        remarks: string | null;
        netPaid: string;
    }[]>;
    getOffCycleTypeBreakdown(user: User, month: string): Promise<{
        type: string;
        total: number;
    }[]>;
    getOffCycleTaxImpact(user: User, month: string): Promise<{
        lines: {
            payrollDate: string;
            gross: string;
            pension: string;
            nhf: string | null;
            paye: string;
            net: string;
            type: string;
        }[];
        totalRegularTax: number;
    }>;
    getOffCycleDashboard(user: User, month?: string, fromDate?: string, toDate?: string, employeeId?: string): Promise<{
        summary: ({
            employeeId: string;
            name: string;
            payrollDate: string;
            type: string;
            amount: string;
            taxable: boolean;
        } | {
            employeeId: string;
            name: string;
            payrollDate: string;
            type: string;
            amount: string;
            taxable: boolean;
        })[];
        vsRegular: {
            regular: {
                gross: number;
                tax: number;
                net: number;
            };
            offCycle: {
                gross: number;
                tax: number;
                net: number;
            };
            offPercent: number;
        };
        byEmployee: {
            payrollDate: string;
            type: string;
            amount: string;
            taxable: boolean;
            remarks: string | null;
            netPaid: string;
        }[];
        typeBreakdown: {
            type: string;
            total: number;
        }[];
        taxImpact: {
            lines: {
                payrollDate: string;
                gross: string;
                pension: string;
                nhf: string | null;
                paye: string;
                net: string;
                type: string;
            }[];
            totalRegularTax: number;
        };
    }>;
    getOffCyclePayrollSummary(user: User): Promise<{
        totalDeductions: number;
        payrollRunId: string;
        payrollDate: string;
        payrollMonth: string;
        approvalStatus: string;
        paymentStatus: string | null;
        totalGrossSalary: number;
        employeeCount: number;
        totalNetSalary: number;
        totalPayrollCost: number;
    }[]>;
}
