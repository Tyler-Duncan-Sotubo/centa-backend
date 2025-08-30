import { Pool } from 'pg';
export declare class HotQueries {
    private pool;
    constructor(pool: Pool);
    activeDeductions(empId: string, payDate: string): Promise<any>;
    bonusesByRange(empId: string, startISO: string, endISO: string): Promise<any>;
    payGroupById(payGroupId: string): Promise<any>;
    groupAllowances(payGroupId: string): Promise<any>;
    adjustmentsByDate(companyId: string, empId: string, payrollDate: string): Promise<any>;
    expensesByRange(empId: string, startISO: string, endISO: string): Promise<{
        id: string;
        category: string;
        amount: string;
    }[]>;
    employeeName(empId: string): Promise<{
        firstName: string;
        lastName: string;
    } | undefined>;
}
