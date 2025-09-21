import { ReportService } from './report.service';
import { User } from 'src/common/types/user.type';
import { GenerateReportService } from './generate-report.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class ReportController extends BaseController {
    private readonly reportService;
    private readonly generateReportService;
    constructor(reportService: ReportService, generateReportService: GenerateReportService);
    getGlSummary(user: User, month: string): Promise<{
        rows: never[];
        columns: never[];
        empty: boolean;
    } | {
        rows: {
            glAccountCode: string;
            yearMonth: string;
            label: string;
            debit: string;
            credit: string;
        }[];
        columns: {
            field: string;
            title: string;
        }[];
        empty?: undefined;
    }>;
    getPayrollVariance(user: User): Promise<{
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
    getEmployeeVariance(user: User): Promise<{
        payrollRunId: string;
        payrollDate: string;
        previousPayrollDate: string;
        varianceList: {
            employeeId: string;
            fullName: string;
            previous: {
                grossSalary: import("decimal.js").Decimal;
                netSalary: import("decimal.js").Decimal;
                paye: import("decimal.js").Decimal;
                pension: import("decimal.js").Decimal;
                nhf: import("decimal.js").Decimal;
                employerPension: import("decimal.js").Decimal;
            };
            current: {
                grossSalary: import("decimal.js").Decimal;
                netSalary: import("decimal.js").Decimal;
                paye: import("decimal.js").Decimal;
                pension: import("decimal.js").Decimal;
                nhf: import("decimal.js").Decimal;
                employerPension: import("decimal.js").Decimal;
            };
            variance: {
                grossSalaryDiff: import("decimal.js").Decimal;
                netSalaryDiff: import("decimal.js").Decimal;
                payeDiff: import("decimal.js").Decimal;
                pensionDiff: import("decimal.js").Decimal;
                nhfDiff: import("decimal.js").Decimal;
                employerPensionDiff: import("decimal.js").Decimal;
            };
        }[];
    } | null>;
    getPayrollSummary(user: User, month: string): Promise<{
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
    getCombinedPayroll(user: User): Promise<{
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
    getPayrollAnalyticsReport(user: User, month?: string): Promise<{
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
    getCostByPayGroup(user: User, month: string): Promise<{
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
    getTopBonusRecipients(user: User, month: string, limit?: number): Promise<({
        employeeId: string;
        fullName: string;
        bonus: number;
    } | {
        employeeId: string;
        fullName: string;
        bonus: number;
    })[]>;
    getVarianceReport(user: User): Promise<{
        company: {
            rows: never[];
            columns: never[];
            payrollDate: null;
            previousPayrollDate: null;
            empty: boolean;
        } | {
            payrollDate: string;
            previousPayrollDate: string;
            rows: {
                [x: string]: string;
                metric: string;
                variance: string;
            }[];
            columns: {
                field: string;
                title: string;
            }[];
            empty?: undefined;
        };
        employees: {
            rows: never[];
            columns: never[];
            payrollDate: null;
            previousPayrollDate: null;
            empty: boolean;
        } | {
            payrollDate: string;
            previousPayrollDate: string;
            rows: any[];
            columns: {
                field: string;
                title: string;
            }[];
            empty?: undefined;
        };
    }>;
    getLoanSummaryReport(user: User): Promise<{
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
    getLoanRepaymentReport(user: User): Promise<({
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
    getDeductionsSummary(user: User, month?: string): Promise<{
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
    downloadPaymentAdvice(user: User, id: string, format?: 'internal' | 'bank'): Promise<{
        url: {
            url: string;
            record: any;
        } | null;
    }>;
    generateGLSummary(user: User, month: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadYTD(user: User, format?: 'csv' | 'excel'): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadCompanyVariance(user: User): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadEmployeeVariance(user: User): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadPayrollDashboard(user: User): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadRunSummaries(user: User, month?: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadEmployeeDeductions(user: User, month: string, format?: 'csv' | 'excel'): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadCostByPayGroup(user: User, month: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadCostByDepartment(user: User, month: string, format?: 'csv' | 'excel'): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadTopBonusRecipients(user: User, month: string, limit?: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadLoanSummaryReport(user: User): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadLoanRepaymentReport(user: User, month?: string, format?: 'csv' | 'excel'): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
}
