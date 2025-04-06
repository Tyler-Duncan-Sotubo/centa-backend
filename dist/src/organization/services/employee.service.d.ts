import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeBankDetailsDto, CreateEmployeeDto, UpdateEmployeeBankDetailsDto, UpdateEmployeeDto } from '../dto';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateEmployeeTaxDetailsDto } from '../dto/create-employee-tax-details.dto';
import { UpdateEmployeeTaxDetailsDto } from '../dto/update-employee-tax-details.dto';
import { CacheService } from 'src/config/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { EmployeeInvitationService } from 'src/notification/services/employee-invitation.service';
import { OnboardingService } from './onboarding.service';
import { Queue } from 'bullmq';
export declare class EmployeeService {
    private db;
    private readonly aws;
    private readonly cache;
    private readonly config;
    private readonly onboardingService;
    private readonly employeeInvitationService;
    private emailQueue;
    constructor(db: db, aws: AwsService, cache: CacheService, config: ConfigService, onboardingService: OnboardingService, employeeInvitationService: EmployeeInvitationService, emailQueue: Queue);
    private generateToken;
    addEmployee(dto: CreateEmployeeDto, company_id: string): Promise<{
        first_name: string;
        email: string;
    }>;
    addMultipleEmployees(dtoArray: CreateEmployeeDto[], company_id: string): Promise<{
        email: string;
        status: string;
        company_id: string;
    }[]>;
    getEmployeeByUserId(user_id: string): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        phone: string | null;
        email: string;
        employment_status: string | null;
        start_date: string;
        employee_number: string | null;
        department_id: string | null;
        annual_gross: number | null;
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
        companyId: string;
        id: string;
        company_name: string;
        apply_nhf: boolean | null;
    }>;
    getEmployees(company_id: string): Promise<{
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
    getEmployeesByDepartment(department_id: string): Promise<{
        first_name: string;
        last_name: string;
        job_title: string;
        email: string;
        employment_status: string | null;
        start_date: string;
        is_active: boolean | null;
    }[]>;
    updateEmployee(employee_id: string, dto: UpdateEmployeeDto): Promise<string>;
    deleteEmployee(employee_id: string): Promise<{
        message: string;
    }>;
    addEmployeeBankDetails(employee_id: string, dto: CreateEmployeeBankDetailsDto): Promise<{
        id: string;
        employee_id: string;
        bank_account_number: string | null;
        bank_account_name: string | null;
        bank_name: string | null;
    }>;
    updateEmployeeBankDetails(employee_id: string, dto: UpdateEmployeeBankDetailsDto): Promise<string>;
    addEmployeeTaxDetails(employee_id: string, dto: CreateEmployeeTaxDetailsDto): Promise<{
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
    updateEmployeeTaxDetails(employee_id: string, dto: UpdateEmployeeTaxDetailsDto): Promise<string>;
    verifyBankAccount(accountNumber: any, bankCode: any): Promise<unknown>;
}
