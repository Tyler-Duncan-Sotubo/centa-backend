import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import { DeductionsService } from '../deductions/deductions.service';
export declare class TaxService {
    private db;
    private readonly cache;
    private readonly pusher;
    private readonly deductions;
    constructor(db: db, cache: CacheService, pusher: PusherService, deductions: DeductionsService);
    onPayrollApproval(company_id: string, payrollMonth: string, payrollRunId: string): Promise<{
        message: string;
    }>;
    private getCompany;
    getCompanyTaxFilings(user_id: string): Promise<{
        id: string;
        tax_type: string;
        total_deductions: number;
        status: string | null;
        month: string;
    }[]>;
    updateCompanyTaxFilings(tax_filing_id: string, status: string): Promise<any>;
    generateTaxFilingExcel(tax_filing_id: string): Promise<Buffer<import("exceljs").Buffer>>;
    generateVoluntaryDeductionsExcel(deductionName: string, payrollMonth: string): Promise<Buffer<import("exceljs").Buffer>>;
}
