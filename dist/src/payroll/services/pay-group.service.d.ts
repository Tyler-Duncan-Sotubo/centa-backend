import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeGroupDto } from '../dto/create-employee-group.dto';
import { UpdateEmployeeGroupDto } from '../dto/update-employee-group.dto';
import { OnboardingService } from 'src/organization/services/onboarding.service';
export declare class PayGroupService {
    private db;
    private readonly onboardingService;
    constructor(db: db, onboardingService: OnboardingService);
    getEmployeeById(employee_id: string): Promise<{
        id: string;
    }>;
    getEmployeeGroups(company_id: string): Promise<{
        id: string;
        name: string;
        pay_schedule_id: string;
        apply_nhf: boolean | null;
        apply_pension: boolean | null;
        apply_paye: boolean | null;
        apply_additional: boolean | null;
        payFrequency: string;
        createdAt: Date | null;
    }[]>;
    createEmployeeGroup(company_id: string, dto: CreateEmployeeGroupDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        apply_nhf: boolean | null;
        company_id: string;
        apply_paye: boolean | null;
        apply_pension: boolean | null;
        apply_additional: boolean | null;
        is_demo: boolean | null;
        pay_schedule_id: string;
    }>;
    getEmployeeGroup(group_id: string): Promise<{
        id: string;
        name: string;
        apply_paye: boolean | null;
        apply_pension: boolean | null;
        apply_nhf: boolean | null;
        apply_additional: boolean | null;
        is_demo: boolean | null;
        pay_schedule_id: string;
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
}
