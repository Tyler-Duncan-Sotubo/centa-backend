import { CreatePayrollOverrideDto } from './dto/create-payroll-override.dto';
import { UpdatePayrollOverrideDto } from './dto/update-payroll-override.dto';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class PayrollOverridesService {
    private db;
    private auditService;
    constructor(db: db, auditService: AuditService);
    create(dto: CreatePayrollOverrideDto, user: User): Promise<{
        id: string;
        createdAt: string | null;
        companyId: string;
        employeeId: string;
        payrollDate: string;
        notes: string | null;
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
