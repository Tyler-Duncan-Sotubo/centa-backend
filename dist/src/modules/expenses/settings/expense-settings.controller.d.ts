import { ExpensesSettingsService } from './expense-settings.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class ExpenseSettingsController extends BaseController {
    private readonly expenseSettingsService;
    constructor(expenseSettingsService: ExpensesSettingsService);
    getAllowanceSettings(user: User): Promise<{
        multiLevelApproval: boolean;
        approverChain: any;
        fallbackRoles: any;
    }>;
    updatePayrollSetting(user: User, key: string, value: any): Promise<void>;
}
