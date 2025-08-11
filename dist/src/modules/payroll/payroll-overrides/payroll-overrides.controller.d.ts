import { PayrollOverridesService } from './payroll-overrides.service';
import { CreatePayrollOverrideDto } from './dto/create-payroll-override.dto';
import { UpdatePayrollOverrideDto } from './dto/update-payroll-override.dto';
import { User } from 'src/common/types/user.type';
export declare class PayrollOverridesController {
    private readonly payrollOverridesService;
    constructor(payrollOverridesService: PayrollOverridesService);
    create(user: User, createPayrollOverrideDto: CreatePayrollOverrideDto): Promise<{
        id: string;
        createdAt: string | null;
        companyId: string;
        employeeId: string;
        notes: string | null;
        payrollDate: string;
        forceInclude: boolean | null;
    }>;
    findAll(user: User): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        payrollDate: string;
        forceInclude: boolean | null;
        notes: string | null;
        createdAt: string | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        payrollDate: string;
        forceInclude: boolean | null;
        notes: string | null;
        createdAt: string | null;
    }>;
    update(id: string, updatePayrollOverrideDto: UpdatePayrollOverrideDto, user: User): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        payrollDate: string;
        forceInclude: boolean | null;
        notes: string | null;
        createdAt: string | null;
    }>;
}
