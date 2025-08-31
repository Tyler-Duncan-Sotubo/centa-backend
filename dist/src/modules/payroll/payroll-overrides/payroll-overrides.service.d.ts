import { CreatePayrollOverrideDto } from './dto/create-payroll-override.dto';
import { UpdatePayrollOverrideDto } from './dto/update-payroll-override.dto';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PayrollOverridesService {
    private db;
    private auditService;
    private cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    create(dto: CreatePayrollOverrideDto, user: User): Promise<{
        id: string;
        createdAt: string | null;
        companyId: string;
        employeeId: string;
        notes: string | null;
        payrollDate: string;
        forceInclude: boolean | null;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        payrollDate: string;
        forceInclude: boolean | null;
        notes: string | null;
        createdAt: string | null;
    }[]>;
    findOne(id: string, companyId: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        payrollDate: string;
        forceInclude: boolean | null;
        notes: string | null;
        createdAt: string | null;
    }>;
    update(id: string, dto: UpdatePayrollOverrideDto, user: User): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        payrollDate: string;
        forceInclude: boolean | null;
        notes: string | null;
        createdAt: string | null;
    }>;
}
