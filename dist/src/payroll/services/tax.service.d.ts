import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/config/cache/cache.service';
export declare class TaxService {
    private db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
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
    generateTaxFilingExcel(tax_filing_id: string): Promise<Buffer<ArrayBufferLike>>;
}
