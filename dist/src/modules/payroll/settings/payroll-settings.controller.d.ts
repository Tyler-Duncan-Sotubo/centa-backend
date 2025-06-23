import { User } from 'src/common/types/user.type';
import { PayrollSettingsService } from './payroll-settings.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PayrollSettingsController extends BaseController {
    private readonly payrollSettingsService;
    constructor(payrollSettingsService: PayrollSettingsService);
    getStatutoryDeductions(user: User): Promise<any>;
    getAllowanceSettings(user: User): Promise<any>;
    getApprovalAndProration(user: User): Promise<{
        multiLevelApproval: boolean;
        approverChain: string[];
        approvalFallback: string[];
        approver: any;
        enableProration: boolean;
    }>;
    getLoanSettings(user: User): Promise<{
        useLoan: boolean;
        maxPercentOfSalary: number;
        minAmount: number;
        maxAmount: number;
    }>;
    getThirteenthMonthSettings(user: User): Promise<{
        enable13thMonth: boolean;
        paymentDate: any;
        paymentAmount: number;
        paymentType: any;
        paymentPercentage: number;
    }>;
    updatePayrollSetting(user: User, key: string, value: any): Promise<void>;
}
