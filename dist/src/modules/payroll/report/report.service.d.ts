import { db } from 'src/drizzle/types/drizzle';
import { PaySchedulesService } from '../pay-schedules/pay-schedules.service';
import Decimal from 'decimal.js';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class ReportService {
    private readonly db;
    private readonly paySchedulesService;
    private readonly companySettings;
    constructor(db: db, paySchedulesService: PaySchedulesService, companySettings: CompanySettingsService);
    getLatestPayrollSummaryWithVariance(companyId: string): Promise<{
        current: null;
        variance: null;
    } | {
        current: {
            payroll_run_id: string;
            payroll_date: string;
            total_gross_salary: number;
            total_netSalary: number;
            total_deductions: number;
            employee_count: number;
            totalPayrollCost: number;
        };
        variance: {
            gross_salary_variance: number;
            netSalary_variance: number;
            deductions_variance: number;
            payroll_cost_variance: number;
            employee_count_variance: number;
        };
    }>;
    getEmployeePayrollVariance(companyId: string): Promise<{
        payrollRunId: string;
        payrollDate: string;
        previousPayrollDate: string;
        varianceList: {
            employeeId: string;
            fullName: string;
            previous: {
                grossSalary: Decimal;
                netSalary: Decimal;
                paye: Decimal;
                pension: Decimal;
                nhf: Decimal;
                employerPension: Decimal;
            };
            current: {
                grossSalary: Decimal;
                netSalary: Decimal;
                paye: Decimal;
                pension: Decimal;
                nhf: Decimal;
                employerPension: Decimal;
            };
            variance: {
                grossSalaryDiff: Decimal;
                netSalaryDiff: Decimal;
                payeDiff: Decimal;
                pensionDiff: Decimal;
                nhfDiff: Decimal;
                employerPensionDiff: Decimal;
            };
        }[];
    } | null>;
    getVoluntaryDeductionTotals(companyId: string): Promise<Map<string, number>>;
    getPayrollSummary(companyId: string): Promise<{
        voluntaryDeductions: number;
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
    getCombinedPayroll(companyId: string): Promise<{
        payrollSummary: {
            voluntaryDeductions: number;
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
        }[];
        nextPayDate: Date | null;
    }>;
    getPayrollDashboard(companyId: string, month?: string): Promise<{
        runSummaries: {
            payrollRunId: string;
            payrollDate: string;
            payrollMonth: string;
            approvalStatus: string;
            paymentStatus: string | null;
            totalGross: number;
            totalDeductions: number;
            totalBonuses: number;
            totalNet: number;
            employeeCount: number;
            costPerRun: number;
        }[];
        yearToDate: {
            year: string;
            totalGrossYTD: number;
            totalDeductionsYTD: number;
            totalBonusesYTD: number;
            totalNetYTD: number;
            employeeCountYTD: number;
        };
        headcount: number;
        totalCurrentSalary: number;
        costTrend: {
            monthCost: number;
            deltaCost: number;
            pctChange: number;
            month: string;
            monthGross: number;
            monthDeductions: number;
            monthBonuses: number;
            monthNet: number;
        }[];
        onboardingCompleted: any;
    }>;
    getPayrollCostReport(companyId: string, month: string): Promise<{
        payGroupCost: ({
            totalGross: number;
            totalNet: number;
            headcount: number;
            payGroupId: string;
            payGroupName: string;
        } | {
            totalGross: number;
            totalNet: number;
            headcount: number;
            payGroupId: string;
            payGroupName: string;
        })[];
        departmentCost: ({
            totalGross: number;
            totalNet: number;
            headcount: number;
            departmentName: any;
        } | {
            totalGross: number;
            totalNet: number;
            headcount: number;
            departmentName: any;
        })[];
    }>;
    getCostByPayGroup(companyId: string, month: string): Promise<({
        payGroupId: string;
        payGroupName: string;
        totalGross: number;
        totalNet: number;
        headcount: number;
    } | {
        payGroupId: string;
        payGroupName: string;
        totalGross: number;
        totalNet: number;
        headcount: number;
    })[]>;
    getCostByDepartment(companyId: string, month: string): Promise<({
        departmentName: any;
        totalGross: number;
        totalNet: number;
        headcount: number;
    } | {
        departmentName: any;
        totalGross: number;
        totalNet: number;
        headcount: number;
    })[]>;
    getTopBonusRecipients(companyId: string, month: string, limit?: number): Promise<({
        employeeId: string;
        fullName: string;
        bonus: number;
    } | {
        employeeId: string;
        fullName: string;
        bonus: number;
    })[]>;
    private getSalaryInsights;
    YtdReport(companyId: string): Promise<{
        totals: {
            gross_salary_ytd: number;
            net_salary_ytd: number;
            paye_tax_ytd: number;
            pension_contribution_ytd: number;
            employer_pension_contribution_ytd: number;
            nhf_contribution_ytd: number;
        };
        employees: ({
            employeeId: string;
            firstName: any;
            lastName: any;
            employeeNumber: any;
            gross_salary_ytd: number;
            net_salary_ytd: number;
            paye_tax_ytd: number;
            pension_contribution_ytd: number;
            employer_pension_contribution_ytd: number;
            nhf_contribution_ytd: number;
        } | {
            employeeId: string;
            firstName: any;
            lastName: any;
            employeeNumber: any;
            gross_salary_ytd: number;
            net_salary_ytd: number;
            paye_tax_ytd: number;
            pension_contribution_ytd: number;
            employer_pension_contribution_ytd: number;
            nhf_contribution_ytd: number;
        })[];
    }>;
    getPayrollAnalyticsReport(companyId: string, month?: string): Promise<{
        month: string;
        summary: {
            voluntaryDeductions: number;
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
        }[];
        salaryInsights: {
            breakdown: ({
                payrollMonth: string;
                employeeId: string;
                employeeName: unknown;
                grossSalary: string | null;
                netSalary: string | null;
                deductions: string | null;
                bonuses: string | null;
                paymentStatus: string | null;
            } | {
                payrollMonth: string;
                employeeId: string;
                employeeName: unknown;
                grossSalary: string | null;
                netSalary: string | null;
                deductions: string | null;
                bonuses: string | null;
                paymentStatus: string | null;
            })[];
            stats: {
                avgSalary: string | null;
                highestPaid: string | null;
                lowestPaid: string | null;
            };
            distribution: {
                salaryRange: unknown;
                count: number;
            }[];
            byDepartment: ({
                departmentName: any;
                totalNetSalary: string | null;
            } | {
                departmentName: any;
                totalNetSalary: string | null;
            })[];
        };
        ytdData: {
            totals: {
                gross_salary_ytd: number;
                net_salary_ytd: number;
                paye_tax_ytd: number;
                pension_contribution_ytd: number;
                employer_pension_contribution_ytd: number;
                nhf_contribution_ytd: number;
            };
            employees: ({
                employeeId: string;
                firstName: any;
                lastName: any;
                employeeNumber: any;
                gross_salary_ytd: number;
                net_salary_ytd: number;
                paye_tax_ytd: number;
                pension_contribution_ytd: number;
                employer_pension_contribution_ytd: number;
                nhf_contribution_ytd: number;
            } | {
                employeeId: string;
                firstName: any;
                lastName: any;
                employeeNumber: any;
                gross_salary_ytd: number;
                net_salary_ytd: number;
                paye_tax_ytd: number;
                pension_contribution_ytd: number;
                employer_pension_contribution_ytd: number;
                nhf_contribution_ytd: number;
            })[];
        };
    }>;
    private getDeductionBreakdownByMonth;
    private getEmployerCostBreakdownByMonth;
    getDeductionsByEmployee(companyId: string, month: string): Promise<{
        employeeId: string;
        employeeName: string;
        paye: string;
        pension: string;
        nhf: string | null;
        salaryAdvance: string | null;
        voluntary: any;
        total: any;
    }[]>;
    getDeductionsSummary(companyId: string, month?: string): Promise<{
        deductionBreakdown: {
            payrollMonth: string;
            paye: number;
            pension: number;
            nhf: number;
            custom: number;
        }[];
        employerCostBreakdown: {
            payrollMonth: string;
            gross: number;
            employerPension: number;
            totalCost: number;
        }[];
        deductionByEmployee: {
            employeeId: string;
            employeeName: string;
            paye: string;
            pension: string;
            nhf: string | null;
            salaryAdvance: string | null;
            voluntary: any;
            total: any;
        }[];
    }>;
    getLoanFullReport(companyId: string): Promise<{
        outstandingSummary: ({
            employeeId: string;
            employeeName: string;
            totalLoanAmount: string;
            totalRepaid: string;
            outstanding: number;
            status: string;
        } | {
            employeeId: string;
            employeeName: string;
            totalLoanAmount: string;
            totalRepaid: string;
            outstanding: number;
            status: string;
        })[];
        monthlySummary: {
            year: number;
            month: number;
            status: string;
            totalLoanAmount: number;
            totalRepaid: number;
            totalOutstanding: number;
        }[];
    }>;
    getLoanRepaymentReport(companyId: string): Promise<({
        employeeId: any;
        employeeName: string;
        totalRepaid: number;
        repaymentCount: number;
        firstRepayment: string;
        lastRepayment: string;
    } | {
        employeeId: any;
        employeeName: string;
        totalRepaid: number;
        repaymentCount: number;
        firstRepayment: string;
        lastRepayment: string;
    })[]>;
}
