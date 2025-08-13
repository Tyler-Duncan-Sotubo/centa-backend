import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
export declare class CompanySettingsService {
    private db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private settings;
    private tagCompany;
    private tagGroup;
    private ttlSeconds;
    getSetting(companyId: string, key: string): Promise<any | null>;
    getAllSettings(companyId: string): Promise<any[]>;
    getSettingsOrDefaults(companyId: string, key: string, defaultValue: any): Promise<any>;
    setSetting(companyId: string, key: string, value: any): Promise<void>;
    getSettingsByGroup(companyId: string, prefix: string): Promise<any[]>;
    setSettings(companyId: string): Promise<void>;
    deleteSetting(companyId: string, key: string): Promise<void>;
    getDefaultManager(companyId: string): Promise<{
        defaultManager: string;
    }>;
    getPayrollConfig(companyId: string): Promise<{
        applyPaye: boolean;
        applyNhf: boolean;
        applyPension: boolean;
        applyNhis: boolean;
        applyNsitf: boolean;
    }>;
    getAllowanceConfig(companyId: string): Promise<{
        basicPercent: number;
        housingPercent: number;
        transportPercent: number;
        allowanceOthers: {
            type: string;
            percentage?: number;
            fixedAmount?: number;
        }[];
    }>;
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
    fetchSettings(companyId: string, keys: string[]): Promise<Record<string, any>>;
    getTwoFactorAuthSetting(companyId: string): Promise<{
        twoFactorAuth: boolean;
    }>;
    getOnboardingSettings(companyId: string): Promise<{
        payFrequency: boolean;
        payGroup: boolean;
        taxDetails: boolean;
        companyLocations: boolean;
        departments: boolean;
        jobRoles: boolean;
        costCenter: boolean;
        uploadEmployees: boolean;
    }>;
}
