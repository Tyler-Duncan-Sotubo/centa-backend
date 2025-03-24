import { db } from 'src/drizzle/types/drizzle';
export declare class AnalyticsService {
    private db;
    constructor(db: db);
    getPayrollOverview(company_id: string): Promise<{
        payrollMonth: string;
        totalPayrollCost: string | null;
        totalNetSalaries: string | null;
        totalDeductions: string | null;
        totalBonuses: string | null;
        employeesProcessed: number;
        paymentStatus: string | null;
    }[]>;
    employeesSalaryBreakdown(company_id: string): Promise<{
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
    getDeductionsReport(company_id: string): Promise<{
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
    getCompanyFinanceReport(companyId: string, startDate?: string, endDate?: string): Promise<{
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
}
