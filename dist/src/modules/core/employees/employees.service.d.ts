import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { ProfileService } from './profile/profile.service';
import { HistoryService } from './history/history.service';
import { DependentsService } from './dependents/dependents.service';
import { CertificationsService } from './certifications/certifications.service';
import { CompensationService } from './compensation/compensation.service';
import { FinanceService } from './finance/finance.service';
import { Workbook } from 'exceljs';
import { DepartmentService } from '../department/department.service';
import { JobRolesService } from '../job-roles/job-roles.service';
import { CostCentersService } from '../cost-centers/cost-centers.service';
import { CreateEmployeeCoreDto } from './dto/create-employee-core.dto';
import { SearchEmployeesDto } from './dto/search-employees.dto';
import { GroupsService } from './groups/groups.service';
import { ConfigService } from '@nestjs/config';
import { EmployeeInvitationService } from 'src/modules/notification/services/employee-invitation.service';
import { CacheService } from 'src/common/cache/cache.service';
import { CreateEmployeeMultiDetailsDto } from './dto/create-employee-multi-details.dto';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { LeaveBalanceService } from 'src/modules/leave/balance/leave-balance.service';
import { AttendanceSettingsService } from 'src/modules/time/settings/attendance-settings.service';
import { EmployeeShiftsService } from 'src/modules/time/employee-shifts/employee-shifts.service';
import { PayslipService } from 'src/modules/payroll/payslip/payslip.service';
import { EmployeeProfileDto } from './dto/update-employee-details.dto';
import { OnboardingService } from 'src/modules/lifecycle/onboarding/onboarding.service';
export declare class EmployeesService {
    private db;
    private audit;
    private profileService;
    private historyService;
    private dependentsService;
    private certificationsService;
    private compensationService;
    private financeService;
    private deptSvc;
    private roleSvc;
    private ccSvc;
    private groupsService;
    private readonly config;
    private readonly employeeInvitationService;
    private readonly cacheService;
    private readonly companySettingsService;
    private readonly permissionService;
    private readonly leaveBalanceService;
    private readonly attendanceSettingsService;
    private readonly employeeShiftsService;
    private readonly payslipService;
    private readonly onboardingService;
    protected table: any;
    constructor(db: db, audit: AuditService, profileService: ProfileService, historyService: HistoryService, dependentsService: DependentsService, certificationsService: CertificationsService, compensationService: CompensationService, financeService: FinanceService, deptSvc: DepartmentService, roleSvc: JobRolesService, ccSvc: CostCentersService, groupsService: GroupsService, config: ConfigService, employeeInvitationService: EmployeeInvitationService, cacheService: CacheService, companySettingsService: CompanySettingsService, permissionService: PermissionsService, leaveBalanceService: LeaveBalanceService, attendanceSettingsService: AttendanceSettingsService, employeeShiftsService: EmployeeShiftsService, payslipService: PayslipService, onboardingService: OnboardingService);
    private generateToken;
    createEmployeeNumber(companyId: string): Promise<string>;
    create(dto: CreateEmployeeCoreDto, currentUser: User): Promise<{
        id: any;
        employeeNumber: any;
        email: any;
        firstName: any;
    }>;
    createEmployee(dto: CreateEmployeeMultiDetailsDto, user: User, employee_id?: string): Promise<string>;
    findAll(employeeId: string, companyId: string, month?: string): Promise<{
        core: {
            employeeManager: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                avatarUrl: string;
            };
            id: any;
            firstName: any;
            lastName: any;
            employeeNumber: any;
            email: any;
            employmentStatus: any;
            probationEndDate: any;
            departmentId: any;
            department: any;
            jobRoleId: any;
            jobRole: string | null;
            costCenter: string | null;
            costCenterId: any;
            location: string | null;
            payGroupId: any;
            locationId: any;
            payGroup: string | null;
            managerId: any;
            avatarUrl: string | null;
            effectiveDate: any;
            companyRoleId: string;
            role: string;
            confirmed: any;
        } | {
            employeeManager: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                avatarUrl: string;
            };
            id: any;
            firstName: any;
            lastName: any;
            employeeNumber: any;
            email: any;
            employmentStatus: any;
            probationEndDate: any;
            departmentId: any;
            department: any;
            jobRoleId: any;
            jobRole: string | null;
            costCenter: string | null;
            costCenterId: any;
            location: string | null;
            payGroupId: any;
            locationId: any;
            payGroup: string | null;
            managerId: any;
            avatarUrl: string | null;
            effectiveDate: any;
            companyRoleId: string;
            role: string;
            confirmed: any;
        } | {
            employeeManager: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                avatarUrl: string;
            };
            id: any;
            firstName: any;
            lastName: any;
            employeeNumber: any;
            email: any;
            employmentStatus: any;
            probationEndDate: any;
            departmentId: any;
            department: any;
            jobRoleId: any;
            jobRole: string | null;
            costCenter: string | null;
            costCenterId: any;
            location: string | null;
            payGroupId: any;
            locationId: any;
            payGroup: string | null;
            managerId: any;
            avatarUrl: string | null;
            effectiveDate: any;
            companyRoleId: string;
            role: string;
            confirmed: any;
        } | {
            employeeManager: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                avatarUrl: string;
            };
            id: any;
            firstName: any;
            lastName: any;
            employeeNumber: any;
            email: any;
            employmentStatus: any;
            probationEndDate: any;
            departmentId: any;
            department: any;
            jobRoleId: any;
            jobRole: string | null;
            costCenter: string | null;
            costCenterId: any;
            location: string | null;
            payGroupId: any;
            locationId: any;
            payGroup: string | null;
            managerId: any;
            avatarUrl: string | null;
            effectiveDate: any;
            companyRoleId: string;
            role: string;
            confirmed: any;
        } | null;
        profile: {} | null;
        history: {
            id: string;
            employeeId: string;
            type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
            title: string;
            startDate: string | null;
            endDate: string | null;
            institution: string | null;
            description: string | null;
            createdAt: Date;
        }[] | null;
        dependents: {
            id: string;
            employeeId: string;
            name: string;
            relationship: string;
            dateOfBirth: string;
            isBeneficiary: boolean | null;
            createdAt: Date;
        }[] | null;
        certifications: {
            id: string;
            employeeId: string;
            name: string;
            authority: string | null;
            licenseNumber: string | null;
            issueDate: string | null;
            expiryDate: string | null;
            documentUrl: string | null;
            createdAt: Date;
        }[] | null;
        compensation: {
            id: string;
            employeeId: string;
            grossSalary: number;
            payGroupId: any;
            applyNhf: boolean;
            startDate: any;
            endDate: any;
        } | {
            id: string;
            employeeId: string;
            grossSalary: number;
            payGroupId: any;
            applyNhf: boolean;
            startDate: any;
            endDate: any;
        } | null;
        finance: {} | null;
        leaveBalance: {
            leaveTypeId: string;
            leaveTypeName: string;
            year: number;
            entitlement: string;
            used: string;
            balance: string;
        }[] | null;
        leaveRequests: {
            requestId: string;
            employeeId: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            status: string;
            reason: string | null;
        }[] | null;
        attendance: {
            summaryList: Array<{
                date: string;
                checkInTime: string | null;
                checkOutTime: string | null;
                status: "absent" | "present" | "late";
            }>;
        } | null;
        payslipSummary: {
            payslip_id: string;
            payroll_date: string;
            gross_salary: string;
            net_salary: string;
            totalDeduction: string;
            taxableIncome: string;
            paye: string;
            pensionContribution: string;
            nhfContribution: string | null;
            salaryAdvance: string | null;
            payslip_pdf_url: string | null;
            paymentStatus: string | null;
            basic: string;
            housing: string;
            transport: string;
            voluntaryDeductions: unknown;
        }[] | null;
    }>;
    getEmployeeByUserId(user_id: string): Promise<{
        employeeManager: {
            id: string;
            name: string;
            email: string;
        };
        first_name: any;
        last_name: any;
        avatar: string | null;
        userId: any;
        email: any;
        group_id: any;
        companyId: string;
        id: any;
        company_name: string;
        start_date: any;
        department_name: any;
        job_role: string | null;
        employee_number: any;
        managerId: any;
        location: string | null;
    } | {
        employeeManager: {
            id: string;
            name: string;
            email: string;
        };
        first_name: any;
        last_name: any;
        avatar: string | null;
        userId: any;
        email: any;
        group_id: any;
        companyId: string;
        id: any;
        company_name: string;
        start_date: any;
        department_name: any;
        job_role: string | null;
        employee_number: any;
        managerId: any;
        location: string | null;
    } | {
        employeeManager: {
            id: string;
            name: string;
            email: string;
        };
        first_name: any;
        last_name: any;
        avatar: string | null;
        userId: any;
        email: any;
        group_id: any;
        companyId: string;
        id: any;
        company_name: string;
        start_date: any;
        department_name: any;
        job_role: string | null;
        employee_number: any;
        managerId: any;
        location: string | null;
    } | {
        employeeManager: {
            id: string;
            name: string;
            email: string;
        };
        first_name: any;
        last_name: any;
        avatar: string | null;
        userId: any;
        email: any;
        group_id: any;
        companyId: string;
        id: any;
        company_name: string;
        start_date: any;
        department_name: any;
        job_role: string | null;
        employee_number: any;
        managerId: any;
        location: string | null;
    }>;
    employeeSalaryDetails(user: User, employeeId: string): Promise<{
        companyAllowance: {
            basicPercent: number;
            housingPercent: number;
            transportPercent: number;
            allowanceOthers: {
                type: string;
                percentage?: number;
                fixedAmount?: number;
            }[];
        };
        compensations: {
            id: string;
            employeeId: string;
            grossSalary: number;
            payGroupId: any;
            applyNhf: boolean;
            startDate: any;
            endDate: any;
        } | {
            id: string;
            employeeId: string;
            grossSalary: number;
            payGroupId: any;
            applyNhf: boolean;
            startDate: any;
            endDate: any;
        };
    }>;
    employeeFinanceDetails(employeeId: string): Promise<{}>;
    findAllEmployees(companyId: string): Promise<({
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        departmentId: any;
        department: any;
        employmentStatus: any;
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: any;
        applyNHf: boolean | null;
        role: string;
    } | {
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        departmentId: any;
        department: any;
        employmentStatus: any;
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: any;
        applyNHf: boolean | null;
        role: string;
    } | {
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        departmentId: any;
        department: any;
        employmentStatus: any;
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: any;
        applyNHf: boolean | null;
        role: string;
    } | {
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        departmentId: any;
        department: any;
        employmentStatus: any;
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: any;
        applyNHf: boolean | null;
        role: string;
    })[]>;
    findOneByUserId(userId: string): Promise<{
        [x: string]: any;
    }>;
    findOne(employeeId: string, companyId: string): Promise<{
        employeeManager: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string;
        };
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        employmentStatus: any;
        probationEndDate: any;
        departmentId: any;
        department: any;
        jobRoleId: any;
        jobRole: string | null;
        costCenter: string | null;
        costCenterId: any;
        location: string | null;
        payGroupId: any;
        locationId: any;
        payGroup: string | null;
        managerId: any;
        avatarUrl: string | null;
        effectiveDate: any;
        companyRoleId: string;
        role: string;
        confirmed: any;
    } | {
        employeeManager: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string;
        };
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        employmentStatus: any;
        probationEndDate: any;
        departmentId: any;
        department: any;
        jobRoleId: any;
        jobRole: string | null;
        costCenter: string | null;
        costCenterId: any;
        location: string | null;
        payGroupId: any;
        locationId: any;
        payGroup: string | null;
        managerId: any;
        avatarUrl: string | null;
        effectiveDate: any;
        companyRoleId: string;
        role: string;
        confirmed: any;
    } | {
        employeeManager: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string;
        };
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        employmentStatus: any;
        probationEndDate: any;
        departmentId: any;
        department: any;
        jobRoleId: any;
        jobRole: string | null;
        costCenter: string | null;
        costCenterId: any;
        location: string | null;
        payGroupId: any;
        locationId: any;
        payGroup: string | null;
        managerId: any;
        avatarUrl: string | null;
        effectiveDate: any;
        companyRoleId: string;
        role: string;
        confirmed: any;
    } | {
        employeeManager: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string;
        };
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
        email: any;
        employmentStatus: any;
        probationEndDate: any;
        departmentId: any;
        department: any;
        jobRoleId: any;
        jobRole: string | null;
        costCenter: string | null;
        costCenterId: any;
        location: string | null;
        payGroupId: any;
        locationId: any;
        payGroup: string | null;
        managerId: any;
        avatarUrl: string | null;
        effectiveDate: any;
        companyRoleId: string;
        role: string;
        confirmed: any;
    }>;
    findEmployeeSummaryByUserId(employeeId: string): Promise<{
        id: any;
        confirmed: any;
        gender: string | null;
        level: string | null;
        country: string | null;
        department: any;
        userId: any;
    } | {
        id: any;
        confirmed: any;
        gender: string | null;
        level: string | null;
        country: string | null;
        department: any;
        userId: any;
    } | {
        id: any;
        confirmed: any;
        gender: string | null;
        level: string | null;
        country: string | null;
        department: any;
        userId: any;
    } | {
        id: any;
        confirmed: any;
        gender: string | null;
        level: string | null;
        country: string | null;
        department: any;
        userId: any;
    }>;
    findManagerByEmployeeId(employeeId: string, companyId: string): Promise<string>;
    findHrRepresentative(companyId: string): Promise<string>;
    findSuperAdminUser(companyId: string): Promise<string>;
    update(employeeId: string, dto: EmployeeProfileDto, userId: string, ip: string): Promise<{
        [x: string]: any;
    } | undefined>;
    remove(employeeId: string): Promise<{
        deleted: boolean;
        id: any;
    }>;
    buildTemplateWorkbook(companyId: string): Promise<Workbook>;
    bulkCreate(user: User, rows: any[]): Promise<{
        successCount: number;
        failedCount: number;
        failedRows: any[];
        created: {
            id: any;
            employeeNumber: any;
            email: any;
        }[];
    }>;
    getManager(companyId: string): Promise<({
        id: any;
        name: string;
    } | {
        id: any;
        name: string;
    })[]>;
    assignManager(employeeId: string, managerId: string): Promise<{
        [x: string]: any;
    }>;
    removeManager(employeeId: string): Promise<{
        [x: string]: any;
    }>;
    findFallbackManagers(companyId: string): Promise<({
        id: any;
        name: string;
        role: string;
        email: string;
    } | {
        id: any;
        name: string;
        role: string;
        email: string;
    })[]>;
    resolveFallbackManager(companyId: string): Promise<string | null>;
    search(dto: SearchEmployeesDto): Promise<({
        id: any;
        employeeNumber: any;
        firstName: any;
        lastName: any;
        email: any;
        employmentStatus: any;
        departmentName: any;
        jobRoleTitle: string | null;
        costCenterName: string | null;
        locationName: string | null;
    } | {
        id: any;
        employeeNumber: any;
        firstName: any;
        lastName: any;
        email: any;
        employmentStatus: any;
        departmentName: any;
        jobRoleTitle: string | null;
        costCenterName: string | null;
        locationName: string | null;
    } | {
        id: any;
        employeeNumber: any;
        firstName: any;
        lastName: any;
        email: any;
        employmentStatus: any;
        departmentName: any;
        jobRoleTitle: string | null;
        costCenterName: string | null;
        locationName: string | null;
    } | {
        id: any;
        employeeNumber: any;
        firstName: any;
        lastName: any;
        email: any;
        employmentStatus: any;
        departmentName: any;
        jobRoleTitle: string | null;
        costCenterName: string | null;
        locationName: string | null;
    })[]>;
    getEmployeeAttendanceByMonth(employeeId: string, companyId: string, yearMonth: string): Promise<{
        summaryList: Array<{
            date: string;
            checkInTime: string | null;
            checkOutTime: string | null;
            status: 'absent' | 'present' | 'late';
        }>;
    }>;
    getEmployeeAttendanceByDate(employeeId: string, companyId: string, date: string): Promise<{
        date: string;
        checkInTime: string | null;
        checkOutTime: string | null;
        status: 'absent' | 'present' | 'late';
        workDurationMinutes: number | null;
        overtimeMinutes: number;
        isLateArrival: boolean;
        isEarlyDeparture: boolean;
    }>;
    findAllLeaveRequestByEmployeeId(employeeId: string, companyId: string): Promise<{
        requestId: string;
        employeeId: string;
        leaveType: string;
        startDate: string;
        endDate: string;
        status: string;
        reason: string | null;
    }[]>;
}
