import { db } from 'src/drizzle/types/drizzle';
import { ConfigService } from '@nestjs/config';
import { EmployeeOnboardingInputDto } from './dto/employee-onboarding-input.dto';
import { AwsService } from 'src/common/aws/aws.service';
export declare class OnboardingService {
    private readonly db;
    private readonly config;
    private readonly aws;
    constructor(db: db, config: ConfigService, aws: AwsService);
    private generateToken;
    assignOnboardingTemplate(employeeId: string, templateId: string, companyId: string, trx?: typeof this.db): Promise<void>;
    getEmployeesInOnboarding(companyId: string): Promise<({
        checklist: {
            id: string;
            title: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
            status: "pending" | "completed" | "in_progress" | "overdue" | "skipped" | "cancelled" | null;
            completedAt: Date | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "completed" | "in_progress" | null;
        startedAt: Date | null;
    } | {
        checklist: {
            id: string;
            title: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
            status: "pending" | "completed" | "in_progress" | "overdue" | "skipped" | "cancelled" | null;
            completedAt: Date | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "completed" | "in_progress" | null;
        startedAt: Date | null;
    })[]>;
    getEmployeeOnboardingDetail(companyId: string, employeeId: string): Promise<{
        checklist: {
            fields: ({
                id: string;
                order: number | null;
                label: string;
                templateId: string;
                fieldKey: string;
                fieldType: string;
                required: boolean | null;
                tag: string;
            } | undefined)[];
            id: string;
            title: string;
            order: number | null;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            dueDaysAfterStart: number | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "completed" | "in_progress" | null;
        startedAt: Date | null;
    } | {
        checklist: {
            fields: ({
                id: string;
                order: number | null;
                label: string;
                templateId: string;
                fieldKey: string;
                fieldType: string;
                required: boolean | null;
                tag: string;
            } | undefined)[];
            id: string;
            title: string;
            order: number | null;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            dueDaysAfterStart: number | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "completed" | "in_progress" | null;
        startedAt: Date | null;
    }>;
    saveEmployeeOnboardingData(employeeId: string, payload: EmployeeOnboardingInputDto): Promise<{
        success: boolean;
    }>;
    private checklistFieldMap;
    upsertChecklistProgress(employeeId: string, templateId: string, payload: EmployeeOnboardingInputDto): Promise<void>;
    updateChecklistStatus(employeeId: string, checklistId: string, status: 'pending' | 'completed'): Promise<{
        id: string;
        employeeId: string;
        checklistId: string;
        status: "pending" | "completed" | "in_progress" | "overdue" | "skipped" | "cancelled" | null;
        completedAt: Date | null;
    }>;
}
