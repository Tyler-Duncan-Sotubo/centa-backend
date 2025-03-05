import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeBankDetailsDto, CreateEmployeeDto, CreateEmployeeGroupDto, UpdateEmployeeBankDetailsDto, UpdateEmployeeDto, UpdateEmployeeGroupDto } from '../dto';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateEmployeeTaxDetailsDto } from '../dto/create-employee-tax-details.dto';
import { UpdateEmployeeTaxDetailsDto } from '../dto/update-employee-tax-details.dto';
import { CacheService } from 'src/config/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';
export declare class EmployeeService {
    private db;
    private readonly aws;
    private readonly cache;
    private readonly config;
    private readonly passwordResetEmailService;
    constructor(db: db, aws: AwsService, cache: CacheService, config: ConfigService, passwordResetEmailService: PasswordResetEmailService);
    private generateToken;
    addEmployee(dto: CreateEmployeeDto, company_id: string): Promise<{
        first_name: string;
        email: string;
    }>;
    addMultipleEmployees(dtoArray: CreateEmployeeDto[], company_id: string): Promise<any>;
    getEmployees(company_id: string): Promise<{
        id: string;
        employee_number: number;
        first_name: string;
        last_name: string;
        job_title: string;
        phone: string | null;
        email: string;
        employment_status: string;
        start_date: string;
        is_active: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        annual_gross: number | null;
        hourly_rate: number | null;
        bonus: number | null;
        commission: number | null;
        is_demo: boolean | null;
        user_id: string | null;
        company_id: string;
        department_id: string | null;
        group_id: string | null;
    }[]>;
    getEmployeesSummary(company_id: string): Promise<{
        first_name: string;
        last_name: string;
        id: string;
    }[]>;
    getEmployeeById(employee_id: string): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        phone: string | null;
        email: string;
        employment_status: string;
        start_date: string;
        is_active: boolean | null;
        employee_number: number;
        department_id: string | null;
        annual_gross: number | null;
        hourly_rate: number | null;
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
            consolidated_relief_allowance: number | null;
            other_reliefs: number | null;
            state_of_residence: string;
            has_exemptions: boolean | null;
            additional_details: unknown;
            createdAt: Date | null;
            updatedAt: Date | null;
            employee_id: string;
        } | null;
    }>;
    getEmployeesByDepartment(department_id: string): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        email: string;
        employment_status: string;
        start_date: string;
        is_active: boolean | null;
    }[]>;
    updateEmployee(employee_id: string, dto: UpdateEmployeeDto): Promise<string>;
    deleteEmployee(employee_id: string): Promise<{
        message: string;
    }>;
    addEmployeeBankDetails(employee_id: string, dto: CreateEmployeeBankDetailsDto): Promise<{
        id: string;
        bank_account_number: string | null;
        bank_account_name: string | null;
        bank_name: string | null;
        employee_id: string;
    }>;
    updateEmployeeBankDetails(employee_id: string, dto: UpdateEmployeeBankDetailsDto): Promise<string>;
    addEmployeeTaxDetails(employee_id: string, dto: CreateEmployeeTaxDetailsDto): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        employee_id: string;
        tin: string;
        consolidated_relief_allowance: number | null;
        other_reliefs: number | null;
        state_of_residence: string;
        has_exemptions: boolean | null;
        additional_details: unknown;
    }>;
    updateEmployeeTaxDetails(employee_id: string, dto: UpdateEmployeeTaxDetailsDto): Promise<string>;
    getEmployeeGroups(company_id: string): Promise<{
        id: string;
        name: string;
        apply_paye: boolean | null;
        apply_pension: boolean | null;
        apply_nhf: boolean | null;
        apply_additional: boolean | null;
        is_demo: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        company_id: string;
    }[]>;
    createEmployeeGroup(company_id: string, dto: CreateEmployeeGroupDto): Promise<{
        id: string;
        name: string;
        company_id: string;
        is_demo: boolean | null;
        apply_paye: boolean | null;
        apply_pension: boolean | null;
        apply_nhf: boolean | null;
        apply_additional: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    getEmployeeGroup(group_id: string): Promise<{
        id: string;
        name: string;
        apply_paye: boolean | null;
        apply_pension: boolean | null;
        apply_nhf: boolean | null;
        apply_additional: boolean | null;
        is_demo: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        company_id: string;
    }>;
    updateEmployeeGroup(group_id: string, dto: UpdateEmployeeGroupDto): Promise<string>;
    deleteEmployeeGroup(group_id: string): Promise<{
        message: string;
    }>;
    getEmployeesInGroup(group_id: string): Promise<{
        id: string;
        first_name: string;
        last_name: string;
    }[]>;
    addEmployeesToGroup(employee_ids: string | string[], group_id: string): Promise<string>;
    removeEmployeesFromGroup(employee_ids: string | string[]): Promise<string>;
    verifyBankAccount(accountNumber: any, bankCode: any): Promise<unknown>;
}
