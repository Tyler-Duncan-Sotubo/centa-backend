import { db } from 'src/drizzle/types/drizzle';
import { ConfigService } from '@nestjs/config';
import { EmployeeOnboardingInputDto } from './dto/employee-onboarding-input.dto';
import { AwsService } from 'src/common/aws/aws.service';
type Tag = 'profile' | 'finance' | 'uploads' | 'other';
export declare class OnboardingService {
    private readonly db;
    private readonly config;
    private readonly aws;
    constructor(db: db, config: ConfigService, aws: AwsService);
    private generateToken;
    assignOnboardingTemplate(employeeId: string, templateId: string, companyId: string, trx?: typeof this.db): Promise<void>;
    getEmployeesInOnboarding(companyId: string): Promise<{
        checklist: {
            id: string;
            title: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
            status: "pending" | "in_progress" | "completed" | "overdue" | "skipped" | "cancelled" | null;
            completedAt: Date | null;
        }[];
        employeeId: string;
        employeeName: unknown;
        email: string;
        templateId: string;
        status: "pending" | "in_progress" | "completed" | null;
        startedAt: Date | null;
    }[]>;
    getEmployeeOnboardingDetail(companyId: string, employeeId: string): Promise<{
        checklist: {
            fields: ({
                fieldKey: string;
                tag?: string;
                order?: number;
            } | undefined)[];
            id: string;
            title: string;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
        }[];
        employeeId: string;
        employeeName: unknown;
        email: string;
        templateId: string;
        status: "pending" | "in_progress" | "completed" | null;
        startedAt: Date | null;
    }>;
    saveEmployeeOnboardingData(employeeId: string, payload: EmployeeOnboardingInputDto): Promise<{
        success: boolean;
    }>;
    upsertChecklistProgress(employeeId: string, templateId: string, payload: EmployeeOnboardingInputDto): Promise<void>;
    updateChecklistStatus(employeeId: string, checklistId: string, status: 'pending' | 'completed'): Promise<{
        id: string;
        employeeId: string;
        checklistId: string;
        status: "pending" | "in_progress" | "completed" | "overdue" | "skipped" | "cancelled" | null;
        completedAt: Date | null;
    }>;
    private norm;
    private exactTitleMap;
    TITLE_RULES: Array<{
        test: (t: string) => boolean;
        tag: Tag;
    }>;
    private inferTagFromTitle;
    private resolveChecklistFields;
    private checklistFieldMap;
}
export {};
