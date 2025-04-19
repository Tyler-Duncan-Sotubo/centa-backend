import { CompanyService, DepartmentService, EmployeeService } from './services';
import { CreateCompanyContactDto, CreateCompanyDto, CreateDepartmentDto, CreateEmployeeBankDetailsDto, CreateEmployeeDto, UpdateCompanyContactDto, UpdateEmployeeDto } from './dto';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
import { CreateEmployeeTaxDetailsDto } from './dto/create-employee-tax-details.dto';
import { UpdateEmployeeTaxDetailsDto } from './dto/update-employee-tax-details.dto';
import { CreatePayFrequencyDto } from './dto/create-pay-frequency.dto';
import { CreateCompanyTaxDto } from './dto/create-company-tax.dto';
import { OnboardingService } from './services/onboarding.service';
export declare class OrganizationController extends BaseController {
    private readonly company;
    private readonly department;
    private readonly employee;
    private readonly onboarding;
    constructor(company: CompanyService, department: DepartmentService, employee: EmployeeService, onboarding: OnboardingService);
    getOnboardingTasks(user: User): Promise<{
        id: string;
        companyId: string;
        taskKey: string;
        completed: boolean;
        url: string;
        completedAt: Date | null;
    }[]>;
    createCompany(dto: CreateCompanyDto, user: User): Promise<{
        id: string;
        name: string;
        country: string;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        industry: string | null;
        registration_number: string | null;
        phone_number: string | null;
        email: string | null;
        logo_url: string | null;
        pay_frequency: string;
        pay_schedule: unknown;
        time_zone: string;
        work_start_time: string | null;
        work_end_time: string | null;
        country_code: string | null;
        created_at: Date;
        updated_at: Date;
    }[]>;
    getCompany(user: User): Promise<{
        id: string;
        name: string;
        country: string;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        industry: string | null;
        registration_number: string | null;
        phone_number: string | null;
        email: string | null;
        logo_url: string | null;
        pay_frequency: string;
        pay_schedule: unknown;
        time_zone: string;
        work_start_time: string | null;
        work_end_time: string | null;
        country_code: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    updateCompany(dto: CreateCompanyDto, user: User): Promise<string>;
    deleteCompany(user: User): Promise<{
        message: string;
    }>;
    createCompanyContact(dto: CreateCompanyContactDto, companyId: string): Promise<{
        id: string;
        name: string;
        company_id: string;
        email: string;
        phone: string | null;
        position: string | null;
    }[]>;
    getCompanyContacts(companyId: string): Promise<{
        id: string;
        name: string;
        position: string | null;
        email: string;
        phone: string | null;
        company_id: string;
    }[]>;
    updateCompanyContact(dto: UpdateCompanyContactDto, companyId: string): Promise<string>;
    getPayFrequencySummary(user: User): Promise<{
        payFrequency: string;
        paySchedules: unknown;
        id: string;
    }[]>;
    getNetPayDate(user: User): Promise<Date | null>;
    getPayFrequency(user: User): Promise<{
        id: string;
        companyId: string;
        startDate: string;
        paySchedule: unknown;
        payFrequency: string;
        weekendAdjustment: string;
        holidayAdjustment: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    createPayFrequency(dto: CreatePayFrequencyDto, user: User): Promise<QueryResult<import("drizzle-orm").Assume<this["row"], QueryResultRow>>>;
    updatePayFrequency(payFrequencyId: string, dto: CreatePayFrequencyDto, user: User): Promise<string>;
    createCompanyTaxDetails(dto: CreateCompanyTaxDto, user: User): Promise<{
        id: string;
        company_id: string;
        created_at: Date;
        updated_at: Date | null;
        tin: string;
        vat_number: string | null;
        nhf_code: string | null;
        pension_code: string | null;
    }[]>;
    getCompanyTaxDetails(user: User): Promise<{
        id: string;
        company_id: string;
        tin: string;
        vat_number: string | null;
        nhf_code: string | null;
        pension_code: string | null;
        created_at: Date;
        updated_at: Date | null;
    }>;
    updateCompanyTaxDetails(dto: CreateCompanyTaxDto, user: User): Promise<string>;
    getDashboardPreview(user: User): Promise<{
        company: {
            name: string;
        };
        nextPayDate: string | Date;
        employees: {
            employment_status: string | null;
            annual_gross: number | null;
        }[];
        bonus: number | never[];
    }>;
    createDepartment(dto: CreateDepartmentDto, user: User): Promise<{
        id: string;
        name: string;
    }[]>;
    getDepartment(user: User): Promise<{
        id: string;
        name: string;
        head: unknown;
        heads_email: string | null;
        created_at: Date;
    }[]>;
    getDepartmentById(departmentId: string): Promise<{
        id: string;
        name: string;
    }>;
    updateDepartment(departmentId: string, dto: CreateDepartmentDto): Promise<{
        id: string;
        name: string;
    }[]>;
    deleteDepartment(departmentId: string): Promise<string>;
    addEmployeeToDepartment(departmentId: string, dto: string[] | string): Promise<{
        message: string;
        addedEmployeeIds: string[];
    }>;
    removeEmployeeFromDepartment(employeeId: string): Promise<string>;
    addEmployee(dto: CreateEmployeeDto, user: User): Promise<void>;
    getEmployee(user: User): Promise<{
        id: string;
        employee_number: string | null;
        first_name: string;
        last_name: string;
        job_title: string;
        phone: string | null;
        email: string;
        employment_status: string | null;
        start_date: string;
        is_active: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        annual_gross: number | null;
        bonus: number | null;
        commission: number | null;
        apply_nhf: boolean | null;
        user_id: string | null;
        company_id: string;
        department_id: string | null;
        group_id: string | null;
    }[]>;
    getEmployeeSummary(user: User): Promise<{
        first_name: string;
        last_name: string;
        id: string;
    }[]>;
    getActiveEmployees(user: User): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        avatar: string | null;
        email: string;
        annual_gross: number | null;
        group_id: string | null;
        companyId: string;
        id: string;
        company_name: string;
        apply_nhf: boolean | null;
        phone: string | null;
        start_date: string;
        department_name: string | null;
        employee_number: string | null;
    }>;
    getEmployeeById(employeeId: string): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        phone: string | null;
        email: string;
        employment_status: string | null;
        start_date: string;
        is_active: boolean | null;
        employee_number: string | null;
        department_id: string | null;
        annual_gross: number | null;
        bonus: number | null;
        commission: number | null;
        group_id: string | null;
        employee_bank_details: {
            id: string;
            bank_account_number: string | null;
            bank_account_name: string | null;
            bank_name: string | null;
            employee_id: string;
        } | null;
        employee_tax_details: {
            id: string;
            tin: string;
            pension_pin: string | null;
            nhf_number: string | null;
            consolidated_relief_allowance: number | null;
            state_of_residence: string | null;
            createdAt: Date | null;
            updatedAt: Date | null;
            employee_id: string;
        } | null;
    }>;
    getEmployeesByDepartment(departmentId: string): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        email: string;
        employment_status: string | null;
        start_date: string;
        is_active: boolean | null;
    }[]>;
    updateEmployee(dto: UpdateEmployeeDto, employeeId: string): Promise<string>;
    deleteEmployee(employeeId: string): Promise<{
        message: string;
    }>;
    addEmployees(file: any, user: User): Promise<unknown>;
    private fieldMapping;
    private transformRowWithMapping;
    private transformRow;
    private validateAndMapToDto;
    createEmployeeBankDetails(dto: CreateEmployeeBankDetailsDto, employeeId: string): Promise<{
        id: string;
        employee_id: string;
        bank_account_number: string | null;
        bank_account_name: string | null;
        bank_name: string | null;
    }>;
    updateEmployeeBankDetails(dto: CreateEmployeeBankDetailsDto, employeeId: string): Promise<string>;
    createEmployeeTaxDetails(dto: CreateEmployeeTaxDetailsDto, employeeId: string): Promise<{
        id: string;
        createdAt: Date | null;
        employee_id: string;
        updatedAt: Date | null;
        tin: string;
        pension_pin: string | null;
        nhf_number: string | null;
        consolidated_relief_allowance: number | null;
        state_of_residence: string | null;
    }>;
    updateEmployeeTaxDetails(dto: UpdateEmployeeTaxDetailsDto, employeeId: string): Promise<string>;
    verifyAccount(accountNumber: string, bankCode: string): Promise<unknown>;
}
