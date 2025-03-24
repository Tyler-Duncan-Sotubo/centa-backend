import { AnalyticsService } from './analytics.service';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
export declare class AnalyticsController extends BaseController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getPayrollOverview(user: User): Promise<{
        payrollMonth: string;
        totalPayrollCost: string | null;
        totalNetSalaries: string | null;
        totalDeductions: string | null;
        totalBonuses: string | null;
        employeesProcessed: number;
        paymentStatus: string | null;
    }[]>;
    employeeSalaryBreakdown(user: User): Promise<{
        salaryBreakdown: {
            payrollMonth: string;
            employeeId: string;
            employeeName: unknown;
            grossSalary: string | null;
            netSalary: string | null;
            deductions: string | null;
            bonuses: string | null;
            paymentStatus: string | null;
        }[];
        salaryStats: {
            avgSalary: string | null;
            highestPaid: number | null;
            lowestPaid: number | null;
        };
        salaryDistribution: {
            salaryRange: unknown;
            count: number;
        }[];
        spendByDepartment: {
            totalNetSalary: string | null;
            departmentName: string;
        }[];
    }>;
    payrollTrendsOverview(user: User): Promise<{
        report_period: string;
        loans: {
            total_loans_given: number;
            total_repaid: number;
            total_outstanding: number;
            status_breakdown: Record<string, number>;
            details: {
                id: string;
                amount: number;
                status: string;
                employeeName: unknown;
            }[];
        };
        bonuses: {
            details: {
                payrollMonth: string;
                totalBonuses: string | null;
                paymentStatus: string | null;
            }[];
        };
    }>;
    deductionReport(user: User): Promise<{
        deductions: {
            payroll_month: string;
            paye: number;
            pension: number;
            nhf: number;
            custom: number;
        }[];
        topEmployees: {
            employee_name: unknown;
            total_deductions: string | null;
        }[];
    }>;
}
