import { db } from 'src/drizzle/types/drizzle';
export declare class OffCycleReportService {
    private db;
    constructor(db: db);
    getOffCycleSummary(companyId: string, fromDate: string, toDate: string): Promise<({
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
    getOffCycleVsRegular(companyId: string, month: string): Promise<{
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
    getOffCycleByEmployee(companyId: string, employeeId: string): Promise<{
        payrollDate: string;
        type: string;
        amount: string;
        taxable: boolean;
        remarks: string | null;
        netPaid: string;
    }[]>;
    getOffCycleTypeBreakdown(companyId: string, month?: string): Promise<{
        type: string;
        total: number;
    }[]>;
    getOffCycleTaxImpact(companyId: string, month?: string): Promise<{
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
    getOffCycleDashboard(companyId: string, options?: {
        month?: string;
        fromDate?: string;
        toDate?: string;
        employeeId?: string;
    }): Promise<{
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
}
