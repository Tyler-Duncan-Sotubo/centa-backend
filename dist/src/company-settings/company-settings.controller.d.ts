import { CompanySettingsService } from './company-settings.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { TaskStatus } from './constants/constants';
export declare class CompanySettingsController extends BaseController {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    backfillOnboarding(): Promise<void>;
    getDefaultManager(user: User): Promise<{
        defaultManager: string;
    }>;
    updateDefaultManager(user: User, body: {
        value: string;
        key: string;
    }): Promise<void>;
    getTwoFactorAuthSetting(user: User): Promise<{
        twoFactorAuth: boolean;
    }>;
    updateTwoFactorAuthSetting(user: User, body: {
        value: boolean;
        key: string;
    }): Promise<void>;
    getOnboardingStep(user: User): Promise<{
        staff: boolean;
        payroll: boolean;
    }>;
    getOnboardingProgress(user: User, module: string): Promise<any>;
    updateOnboardingProgress(user: User, body: {
        module: string;
        task: string;
        status: TaskStatus;
    }): Promise<void>;
}
