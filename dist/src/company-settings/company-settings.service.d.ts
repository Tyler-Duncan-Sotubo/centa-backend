import { db } from 'src/drizzle/types/drizzle';
import { ModuleKey, TaskStatus } from './constants/constants';
export declare class CompanySettingsService {
    private db;
    constructor(db: db);
    private settings;
    private tagCompany;
    private tagGroup;
    getSetting(companyId: string, key: string): Promise<any | null>;
    getAllSettings(companyId: string): Promise<{
        id: string;
        companyId: string;
        key: string;
        value: unknown;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
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
    getOnboardingModule(companyId: string, module: ModuleKey): Promise<any>;
    getOnboardingAll(companyId: string): Promise<{
        payroll: any;
        company: any;
        employees: any;
    }>;
    private getOnboardingLegacy;
    setOnboardingTask(companyId: string, module: ModuleKey, taskKey: string, status: TaskStatus): Promise<void>;
    migrateOnboardingToModules(companyId: string): Promise<void>;
    backfillOnboardingModulesForAllCompanies(): Promise<void>;
    getOnboardingVisibility(companyId: string): Promise<{
        staff: boolean;
        payroll: boolean;
    }>;
}
