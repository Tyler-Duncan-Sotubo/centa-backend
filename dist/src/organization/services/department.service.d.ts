import { db } from 'src/drizzle/types/drizzle';
import { CreateDepartmentDto } from '../dto';
import { CacheService } from 'src/config/cache/cache.service';
export declare class DepartmentService {
    private db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    validateCompany(company_id: string): Promise<{
        id: string;
    }>;
    getDepartments(company_id: string): Promise<{
        id: string;
        name: string;
        head: unknown;
        heads_email: string | null;
        created_at: Date;
    }[]>;
    getDepartmentById(department_id: string): Promise<{
        id: string;
        name: string;
    }>;
    createDepartment(dto: CreateDepartmentDto, user_id: string): Promise<{
        id: string;
        name: string;
    }[]>;
    updateDepartment(dto: CreateDepartmentDto, department_id: string): Promise<{
        id: string;
        name: string;
    }[]>;
    deleteDepartment(department_id: string): Promise<string>;
    addEmployeesToDepartment(employeeIds: string | string[], department_id: string): Promise<{
        message: string;
        addedEmployeeIds: string[];
    }>;
    removeEmployeeFromDepartment(employee_id: string): Promise<string>;
}
