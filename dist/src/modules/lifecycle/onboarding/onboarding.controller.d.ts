import { OnboardingService } from './onboarding.service';
import { OnboardingSeederService } from './seeder.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { EmployeeOnboardingInputDto } from './dto/employee-onboarding-input.dto';
export declare class OnboardingController extends BaseController {
    private readonly onboardingService;
    private readonly seeder;
    constructor(onboardingService: OnboardingService, seeder: OnboardingSeederService);
    getEmployeesInOnboarding(user: User): Promise<({
        checklist: {
            id: string;
            title: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
            status: "pending" | "in_progress" | "completed" | "overdue" | "skipped" | "cancelled" | null;
            completedAt: Date | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "in_progress" | "completed" | null;
        startedAt: Date | null;
    } | {
        checklist: {
            id: string;
            title: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
            status: "pending" | "in_progress" | "completed" | "overdue" | "skipped" | "cancelled" | null;
            completedAt: Date | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "in_progress" | "completed" | null;
        startedAt: Date | null;
    })[]>;
    createEmployeeOnboarding(user: User, dto: EmployeeOnboardingInputDto): Promise<{
        success: boolean;
    }>;
    getEmployeeOnboardingDetail(user: User, employeeId: string): Promise<{
        checklist: {
            fields: ({
                id: string;
                templateId: string;
                order: number | null;
                fieldKey: string;
                label: string;
                fieldType: string;
                required: boolean | null;
                tag: string;
            } | undefined)[];
            id: string;
            title: string;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "in_progress" | "completed" | null;
        startedAt: Date | null;
    } | {
        checklist: {
            fields: ({
                id: string;
                templateId: string;
                order: number | null;
                fieldKey: string;
                label: string;
                fieldType: string;
                required: boolean | null;
                tag: string;
            } | undefined)[];
            id: string;
            title: string;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
        }[];
        employeeId: any;
        employeeName: unknown;
        email: any;
        templateId: string;
        status: "pending" | "in_progress" | "completed" | null;
        startedAt: Date | null;
    }>;
    updateEmployeeChecklist(employeeId: string, checklistId: string, status: 'pending' | 'completed'): Promise<{
        id: string;
        employeeId: string;
        checklistId: string;
        status: "pending" | "in_progress" | "completed" | "overdue" | "skipped" | "cancelled" | null;
        completedAt: Date | null;
    }>;
}
