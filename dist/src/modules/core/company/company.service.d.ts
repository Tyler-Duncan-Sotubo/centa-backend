import { UpdateCompanyDto } from './dto/update-company.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { DepartmentService } from '../department/department.service';
import { PayGroupsService } from 'src/modules/payroll/pay-groups/pay-groups.service';
import { LocationsService } from './locations/locations.service';
import { JobRolesService } from '../job-roles/job-roles.service';
import { CostCentersService } from '../cost-centers/cost-centers.service';
import { ReportService } from 'src/modules/payroll/report/report.service';
import { ReportService as AttendanceReportService } from 'src/modules/time/report/report.service';
import { AwsService } from 'src/common/aws/aws.service';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { OnboardingSeederService } from 'src/modules/lifecycle/onboarding/seeder.service';
import { LeaveBalanceService } from 'src/modules/leave/balance/leave-balance.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class CompanyService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly departmentService;
    private readonly payGroupService;
    private readonly locationService;
    private readonly jobRoleService;
    private readonly costCenterService;
    private readonly payrollReport;
    private readonly attendanceReport;
    private readonly awsService;
    private readonly permissionsService;
    private readonly onboardingSeederService;
    private readonly leaveBalanceService;
    private readonly companySettingsService;
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "companies";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "companies";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            name: import("drizzle-orm/pg-core").PgColumn<{
                name: "name";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 255;
            }>;
            domain: import("drizzle-orm/pg-core").PgColumn<{
                name: "domain";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 255;
            }>;
            isActive: import("drizzle-orm/pg-core").PgColumn<{
                name: "is_active";
                tableName: "companies";
                dataType: "boolean";
                columnType: "PgBoolean";
                data: boolean;
                driverParam: boolean;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            country: import("drizzle-orm/pg-core").PgColumn<{
                name: "country";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 100;
            }>;
            currency: import("drizzle-orm/pg-core").PgColumn<{
                name: "currency";
                tableName: "companies";
                dataType: "string";
                columnType: "PgEnumColumn";
                data: "NGN" | "USD" | "EUR" | "GBP";
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["NGN", "USD", "EUR", "GBP"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            regNo: import("drizzle-orm/pg-core").PgColumn<{
                name: "reg_no";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 100;
            }>;
            logo_url: import("drizzle-orm/pg-core").PgColumn<{
                name: "logo_url";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 255;
            }>;
            primaryContactName: import("drizzle-orm/pg-core").PgColumn<{
                name: "primary_contact_name";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 255;
            }>;
            primaryContactEmail: import("drizzle-orm/pg-core").PgColumn<{
                name: "primary_contact_email";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 255;
            }>;
            primaryContactPhone: import("drizzle-orm/pg-core").PgColumn<{
                name: "primary_contact_phone";
                tableName: "companies";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 20;
            }>;
            subscriptionPlan: import("drizzle-orm/pg-core").PgColumn<{
                name: "subscription_plan";
                tableName: "companies";
                dataType: "string";
                columnType: "PgEnumColumn";
                data: "free" | "pro" | "enterprise";
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["free", "pro", "enterprise"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            trialEndsAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "trial_ends_at";
                tableName: "companies";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "companies";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            updatedAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "updated_at";
                tableName: "companies";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    constructor(db: db, cache: CacheService, audit: AuditService, departmentService: DepartmentService, payGroupService: PayGroupsService, locationService: LocationsService, jobRoleService: JobRolesService, costCenterService: CostCentersService, payrollReport: ReportService, attendanceReport: AttendanceReportService, awsService: AwsService, permissionsService: PermissionsService, onboardingSeederService: OnboardingSeederService, leaveBalanceService: LeaveBalanceService, companySettingsService: CompanySettingsService);
    update(companyId: string, dto: UpdateCompanyDto, userId: string, ip: string): Promise<string>;
    findOne(id: string): Promise<{
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
    findAllEmployeesInCompany(companyId: string): Promise<({
        id: any;
        confirmed: any;
        gender: string | null;
    } | {
        id: any;
        confirmed: any;
        gender: string | null;
    })[]>;
    softDelete(id: string): Promise<{
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
    getCompanySummary(companyId: string): Promise<{
        companyName: string;
        allHolidays: {
            date: string;
            name: string;
        }[];
        totalEmployees: number;
        allEmployees: ({
            id: any;
            employmentStartDate: any;
            employmentEndDate: any;
            employeeNumber: any;
            email: any;
            firstName: any;
            lastName: any;
            departments: any;
            jobRole: string | null;
            annualGross: number | null;
        } | {
            id: any;
            employmentStartDate: any;
            employmentEndDate: any;
            employeeNumber: any;
            email: any;
            firstName: any;
            lastName: any;
            departments: any;
            jobRole: string | null;
            annualGross: number | null;
        } | {
            id: any;
            employmentStartDate: any;
            employmentEndDate: any;
            employeeNumber: any;
            email: any;
            firstName: any;
            lastName: any;
            departments: any;
            jobRole: string | null;
            annualGross: number | null;
        } | {
            id: any;
            employmentStartDate: any;
            employmentEndDate: any;
            employeeNumber: any;
            email: any;
            firstName: any;
            lastName: any;
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
        } | {
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
        recentLeaves: ({
            name: string;
            leaveType: string;
            startDate: string;
            endDate: string;
        } | {
            name: string;
            leaveType: string;
            startDate: string;
            endDate: string;
        })[];
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
            checkListStatus: "in_progress" | "completed" | "pending" | "overdue" | "skipped" | "cancelled" | null;
            checklistId: string;
            title: string;
            dueDaysAfterStart: number | null;
            startDate: Date | null;
        }[];
    }>;
    getCompanyElements(companyId: string): Promise<{
        departments: ({
            head: {
                id: any;
                name: unknown;
                email: any;
                avatarUrl: string | null;
            } | null;
            employees: any;
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
            employees: any;
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
            employees: any;
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
            employees: any;
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
    getAllCompanies(): Promise<{
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
    }[]>;
}
