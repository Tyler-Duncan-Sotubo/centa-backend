import { Pool } from 'pg';
type Row = Record<string, any>;
export type HotRunCache = {
    deductionsByEmp: Map<string, Row[]>;
    bonusesByEmp: Map<string, Row[]>;
    adjustmentsByEmp: Map<string, Row[]>;
    expensesByEmp: Map<string, Row[]>;
    payGroupById: Map<string, Row>;
    groupAllowByPg: Map<string, Row[]>;
};
export declare class HotQueries {
    private pool;
    constructor(pool: Pool);
    private runCache?;
    setRunCache(cache: HotRunCache): void;
    clearRunCache(): void;
    activeDeductions(empId: string, payDate: string): Promise<any>;
    bonusesByRange(empId: string, startISO: string, endISOExclusive: string): Promise<any>;
    payGroupById(payGroupId: string): Promise<any>;
    groupAllowances(payGroupId: string): Promise<any>;
    adjustmentsByDate(companyId: string, empId: string, payrollDate: string): Promise<any>;
    expensesByRange(empId: string, startISO: string, endISO: string): Promise<Row[] | {
        id: string;
        category: string;
        amount: string;
    }[]>;
    employeeName(empId: string): Promise<{
        firstName: string;
        lastName: string;
    } | undefined>;
    activeDeductionsForMany(empIds: string[], payDate: string): Promise<Row[]>;
    bonusesByRangeForMany(empIds: string[], startISO: string, endISOExclusive: string): Promise<Row[]>;
    payGroupsByIds(payGroupIds: string[]): Promise<Row[]>;
    groupAllowancesForPayGroups(payGroupIds: string[]): Promise<Row[]>;
    adjustmentsByDateForMany(companyId: string, empIds: string[], payrollDate: string): Promise<Row[]>;
    expensesByRangeForMany(empIds: string[], startISO: string, endISO: string): Promise<Row[]>;
}
export {};
