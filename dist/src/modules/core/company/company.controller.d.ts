import { CompanyService } from './company.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompanyController extends BaseController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    update(dto: UpdateCompanyDto, user: User, ip: string): Promise<string>;
    get(user: User): Promise<{
        id: string;
        name: string;
        domain: string;
        isActive: boolean;
        country: string;
        currency: "NGN" | "USD" | "EUR" | "GBP";
        regNo: string;
        logo_url: string;
        primaryContactName: string | null;
        primaryContactEmail: string | null;
        primaryContactPhone: string | null;
        subscriptionPlan: "free" | "pro" | "enterprise";
        trialEndsAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(user: User): Promise<{
        id: string;
        name: string;
        domain: string;
        isActive: boolean;
        country: string;
        currency: "NGN" | "USD" | "EUR" | "GBP";
        regNo: string;
        logo_url: string;
        primaryContactName: string | null;
        primaryContactEmail: string | null;
        primaryContactPhone: string | null;
        subscriptionPlan: "free" | "pro" | "enterprise";
        trialEndsAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getCompanySummary(user: User): Promise<{
        companyName: string;
        allHolidays: {
            date: string;
            name: string;
        }[];
        totalEmployees: number;
        allEmployees: ({
            id: string;
            employmentStartDate: string;
            employmentEndDate: Date | null;
            employeeNumber: string;
            email: string;
            firstName: string;
            lastName: string;
            departments: any;
            jobRole: string | null;
            annualGross: number | null;
        } | {
            id: string;
            employmentStartDate: string;
            employmentEndDate: Date | null;
            employeeNumber: string;
            email: string;
            firstName: string;
            lastName: string;
            departments: any;
            jobRole: string | null;
            annualGross: number | null;
        })[];
        allDepartments: ({
            department: any;
            employees: number;
        } | {
            department: any;
            employees: number;
        })[];
        newStartersCount: number;
        leaversCount: number;
        previousMonth: {
            totalEmployees: number;
            newStartersCount: number;
            leaversCount: number;
        };
        payrollSummary: {
            voluntaryDeductions: number;
            totalDeductions: number;
            payrollRunId: string;
            payrollDate: string;
            payrollMonth: string;
            approvalStatus: string;
            paymentStatus: string | null;
            totalGrossSalary: number;
            employeeCount: number;
            totalNetSalary: number;
            totalPayrollCost: number;
        }[];
        recentLeaves: {
            name: string;
            leaveType: string;
            startDate: string;
            endDate: string;
        }[];
        attendanceSummary: {
            month: string;
            present: number;
            absent: number;
            late: number;
        }[];
        announcements: {
            id: string;
            title: string;
        }[];
        onboardingTaskCompleted: boolean;
    }>;
    getEmployeeSummary(employeeId: string): Promise<{
        allHolidays: {
            id: string;
            date: string;
            name: string;
            type: string;
        }[];
        recentLeaves: {
            leaveType: string;
            startDate: string;
            endDate: string;
        }[];
        announcements: {
            id: string;
            title: string;
            body: string;
            createdAt: Date | null;
            category: string;
        }[];
        leaveBalance: {
            total: number;
            breakdown: {
                type: string;
                balance: number;
            }[];
        };
        pendingChecklists: {
            statusId: string;
            checkListStatus: "pending" | "skipped" | "in_progress" | "completed" | "overdue" | "cancelled" | null;
            checklistId: string;
            title: string;
            dueDaysAfterStart: number | null;
            startDate: Date | null;
        }[];
    }>;
    getCompanyElements(user: User): Promise<{
        departments: ({
            head: {
                id: any;
                name: unknown;
                email: any;
                avatarUrl: string | null;
            } | null;
            employees: any[];
            id: any;
            name: any;
            description: any;
            createdAt: any;
        } | {
            head: {
                id: any;
                name: unknown;
                email: any;
                avatarUrl: string | null;
            } | null;
            employees: any[];
            id: any;
            name: any;
            description: any;
            createdAt: any;
        } | {
            head: {
                id: any;
                name: unknown;
                email: any;
                avatarUrl: string | null;
            } | null;
            employees: any[];
            id: any;
            name: any;
            description: any;
            createdAt: any;
        } | {
            head: {
                id: any;
                name: unknown;
                email: any;
                avatarUrl: string | null;
            } | null;
            employees: any[];
            id: any;
            name: any;
            description: any;
            createdAt: any;
        })[];
        payGroups: {
            id: string;
            name: string;
            pay_schedule_id: string;
            apply_nhf: boolean | null;
            apply_pension: boolean | null;
            apply_paye: boolean | null;
            payFrequency: string;
            createdAt: Date | null;
        }[];
        locations: {
            id: string;
            companyId: string;
            isPrimary: boolean | null;
            name: string;
            street: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            postalCode: string | null;
            timeZone: string | null;
            locale: string;
            latitude: number | null;
            longitude: number | null;
            isActive: boolean | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        jobRoles: {
            id: string;
            title: string;
            level: string | null;
            description: string | null;
            companyId: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        costCenters: {
            id: string;
            code: string;
            name: string;
            budget: number;
        }[];
        roles: {
            id: string;
            name: string;
        }[];
        templates: {
            id: string;
            name: string;
        }[];
    }>;
}
