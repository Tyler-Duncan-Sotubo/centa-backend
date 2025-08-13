import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class PayrollSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService);
    private ttlSeconds;
    private tags;
    getAllPayrollSettings(companyId: string): Promise<Record<string, any>>;
    payrollSettings(companyId: string): Promise<any>;
    allowanceSettings(companyId: string): Promise<any>;
    getApprovalAndProrationSettings(companyId: string): Promise<{
        multiLevelApproval: boolean;
        approverChain: string[];
        approvalFallback: string[];
        approver: any;
        enableProration: boolean;
    }>;
    getThirteenthMonthSettings(companyId: string): Promise<{
        enable13thMonth: boolean;
        paymentDate: any;
        paymentAmount: number;
        paymentType: any;
        paymentPercentage: number;
    }>;
    getLoanSettings(companyId: string): Promise<{
        useLoan: boolean;
        maxPercentOfSalary: number;
        minAmount: number;
        maxAmount: number;
    }>;
    updatePayrollSetting(companyId: string, key: string, value: any): Promise<void>;
}
