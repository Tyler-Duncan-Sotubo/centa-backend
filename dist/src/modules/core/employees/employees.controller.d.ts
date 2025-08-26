import { EmployeesService } from './employees.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateEmployeeCoreDto } from './dto/create-employee-core.dto';
import { FastifyReply } from 'fastify';
import { SearchEmployeesDto } from './dto/search-employees.dto';
import { CreateEmployeeMultiDetailsDto } from './dto/create-employee-multi-details.dto';
import { EmployeeProfileDto } from './dto/update-employee-details.dto';
export declare class EmployeesController extends BaseController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    downloadTemplate(reply: FastifyReply): Promise<void>;
    bulkCreate(rows: any[], user: User): Promise<{
        successCount: number;
        failedCount: number;
        failedRows: any[];
        created: {
            id: any;
            employeeNumber: any;
            email: any;
        }[];
    }>;
    createEmployeeNumber(user: User): Promise<string>;
    create(createEmployeeDto: CreateEmployeeCoreDto, user: User): Promise<{
        id: any;
        employeeNumber: any;
        email: any;
        firstName: any;
    }>;
    createEmployee(createEmployeeDto: CreateEmployeeMultiDetailsDto, user: User, employeeId: string): Promise<string>;
    findAllEmployees(user: User): Promise<({
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
    findAllCompanyEmployees(user: User): Promise<({
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
    findAllCompanyEmployeesSummary(user: User, search?: string): Promise<({
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
    } | {
        id: any;
        firstName: any;
        lastName: any;
        employeeNumber: any;
    })[]>;
    getActiveEmployees(user: User): Promise<{
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
    update(id: string, dto: EmployeeProfileDto, user: User, ip: string): Promise<{
        [x: string]: any;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: any;
    }>;
    findAllManagers(user: User): Promise<({
        id: any;
        name: string;
    } | {
        id: any;
        name: string;
    })[]>;
    updateManagerId(id: string, managerId: string): Promise<{
        [x: string]: any;
    }>;
    removeManagerId(id: string): Promise<{
        [x: string]: any;
    }>;
    getFallbackManagers(user: User): Promise<({
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
    search(params: SearchEmployeesDto): Promise<({
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
}
