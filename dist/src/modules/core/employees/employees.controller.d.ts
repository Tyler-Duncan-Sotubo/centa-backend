import { EmployeesService } from './employees.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateEmployeeCoreDto } from './dto/create-employee-core.dto';
import { FastifyReply } from 'fastify';
import { SearchEmployeesDto } from './dto/search-employees.dto';
import { CreateEmployeeMultiDetailsDto } from './dto/create-employee-multi-details.dto';
import { EmployeeProfileDto } from './dto/update-employee-details.dto';
import { EmployeesBulkImportWriteService } from './employees-bulk-import-write.service';
export declare class EmployeesController extends BaseController {
    private readonly employeesService;
    private readonly employeesBulk;
    constructor(employeesService: EmployeesService, employeesBulk: EmployeesBulkImportWriteService);
    downloadTemplate(reply: FastifyReply): Promise<void>;
    bulkCreate(rows: any[], user: User): Promise<{
        successCount: number;
        failedCount: number;
        failedRows: {
            rowIndex: number;
            employeeNumber?: string;
            email?: string;
            error: string;
        }[];
        warnings: {
            rowIndex: number;
            field: string;
            message: string;
        }[];
        created: {
            createdEmps: {
                id: any;
                email: any;
            }[];
            createdUsers: {
                id: string;
                email: string;
            }[];
            inviteTokens: {
                user_id: string;
                token: string;
                expires_at: Date;
                is_used: boolean;
            }[];
        };
        inviteTokens: {
            user_id: string;
            token: string;
            expires_at: Date;
            is_used: boolean;
        }[];
        durationMs: number;
    }>;
    createEmployeeNumber(user: User): Promise<string>;
    create(createEmployeeDto: CreateEmployeeCoreDto, user: User): Promise<{
        id: string;
        employeeNumber: string;
        email: string;
        firstName: string;
    }>;
    createEmployee(createEmployeeDto: CreateEmployeeMultiDetailsDto, user: User, employeeId: string): Promise<string>;
    findAllEmployees(user: User): Promise<({
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        email: string;
        departmentId: string | null;
        department: any;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: string | null;
        applyNHf: boolean | null;
        role: string;
    } | {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        email: string;
        departmentId: string | null;
        department: any;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: string | null;
        applyNHf: boolean | null;
        role: string;
    })[]>;
    findAllCompanyEmployees(user: User): Promise<({
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        email: string;
        departmentId: string | null;
        department: any;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: string | null;
        applyNHf: boolean | null;
        role: string;
    } | {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        email: string;
        departmentId: string | null;
        department: any;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        jobRole: string | null;
        costCenter: string | null;
        location: string | null;
        annualGross: number | null;
        groupId: string | null;
        applyNHf: boolean | null;
        role: string;
    })[]>;
    findAllCompanyEmployeesSummary(user: User, search?: string): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
    }[]>;
    getActiveEmployees(user: User): Promise<{
        employeeManager: {
            id: string;
            name: string;
            email: string;
        };
        first_name: string;
        last_name: string;
        avatar: string | null;
        userId: string;
        email: string;
        group_id: string | null;
        companyId: string;
        id: string;
        company_name: string;
        start_date: string;
        department_name: any;
        job_role: string | null;
        employee_number: string;
        managerId: string | null;
        location: string | null;
    } | {
        employeeManager: {
            id: string;
            name: string;
            email: string;
        };
        first_name: string;
        last_name: string;
        avatar: string | null;
        userId: string;
        email: string;
        group_id: string | null;
        companyId: string;
        id: string;
        company_name: string;
        start_date: string;
        department_name: any;
        job_role: string | null;
        employee_number: string;
        managerId: string | null;
        location: string | null;
    }>;
    getEmployeeSalary(user: User, employeeId: string): Promise<{
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
    getEmployeeFull(id: string, user: User, sectionsCsv?: string, month?: string): Promise<{
        status: string;
        data: {
            core?: any;
            profile?: any;
            history?: any;
            dependents?: any;
            certifications?: any;
            compensation?: any;
            finance?: any;
            leaveBalance?: any;
            leaveRequests?: any;
            attendance?: any;
            payslipSummary?: any;
            avatarUrl?: string;
        };
    }>;
    findOne(id: string, user: User): Promise<{
        employeeManager: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string;
        };
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        email: string;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        probationEndDate: string | null;
        departmentId: string | null;
        department: any;
        jobRoleId: string | null;
        jobRole: string | null;
        costCenter: string | null;
        costCenterId: string | null;
        location: string | null;
        payGroupId: string | null;
        locationId: string | null;
        payGroup: string | null;
        managerId: string | null;
        avatarUrl: string | null;
        effectiveDate: string;
        companyRoleId: string;
        role: string;
        confirmed: boolean | null;
    } | {
        employeeManager: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            avatarUrl: string;
        };
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        email: string;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        probationEndDate: string | null;
        departmentId: string | null;
        department: any;
        jobRoleId: string | null;
        jobRole: string | null;
        costCenter: string | null;
        costCenterId: string | null;
        location: string | null;
        payGroupId: string | null;
        locationId: string | null;
        payGroup: string | null;
        managerId: string | null;
        avatarUrl: string | null;
        effectiveDate: string;
        companyRoleId: string;
        role: string;
        confirmed: boolean | null;
    }>;
    update(id: string, dto: EmployeeProfileDto, user: User, ip: string): Promise<{
        id: string;
        employeeNumber: string;
        userId: string;
        departmentId: string | null;
        jobRoleId: string | null;
        managerId: string | null;
        costCenterId: string | null;
        locationId: string | null;
        payGroupId: string | null;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        employmentStartDate: string;
        employmentEndDate: Date | null;
        confirmed: boolean | null;
        probationEndDate: string | null;
        firstName: string;
        lastName: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
    findAllManagers(user: User): Promise<{
        id: string;
        name: string;
    }[]>;
    updateManagerId(id: string, managerId: string): Promise<{
        id: string;
        employeeNumber: string;
        userId: string;
        departmentId: string | null;
        jobRoleId: string | null;
        managerId: string | null;
        costCenterId: string | null;
        locationId: string | null;
        payGroupId: string | null;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        employmentStartDate: string;
        employmentEndDate: Date | null;
        confirmed: boolean | null;
        probationEndDate: string | null;
        firstName: string;
        lastName: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    removeManagerId(id: string): Promise<{
        id: string;
        employeeNumber: string;
        userId: string;
        departmentId: string | null;
        jobRoleId: string | null;
        managerId: string | null;
        costCenterId: string | null;
        locationId: string | null;
        payGroupId: string | null;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        employmentStartDate: string;
        employmentEndDate: Date | null;
        confirmed: boolean | null;
        probationEndDate: string | null;
        firstName: string;
        lastName: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
    }>;
    getFallbackManagers(user: User): Promise<{
        id: string;
        name: string;
        role: string;
        email: string;
    }[]>;
    search(params: SearchEmployeesDto): Promise<({
        id: string;
        employeeNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        departmentName: any;
        jobRoleTitle: string | null;
        costCenterName: string | null;
        locationName: string | null;
    } | {
        id: string;
        employeeNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        employmentStatus: "probation" | "active" | "on_leave" | "resigned" | "terminated" | "onboarding" | "inactive";
        departmentName: any;
        jobRoleTitle: string | null;
        costCenterName: string | null;
        locationName: string | null;
    })[]>;
    getEmployeeCard(user: User, employeeId: string): Promise<{
        id: string;
        first_name: string;
        last_name: string;
        job_role: string | null;
        department_name: any;
        location: string | null;
        avatar: string | null;
        employeeManager: {
            id: string;
            name: string;
        };
        effectiveDate: string;
        timeInPositionDays: number | null;
    }>;
}
