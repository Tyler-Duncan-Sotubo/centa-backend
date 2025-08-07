import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { CreateDeductionTypeDto } from './dto/create-deduction-type.dto';
import { UpdateEmployeeDeductionDto } from './dto/update-employee-deduction.dto';
import { CreateEmployeeDeductionDto } from './dto/create-employee-deduction.dto';
export declare class DeductionsService {
    private db;
    private auditService;
    constructor(db: db, auditService: AuditService);
    getDeductionTypes(): Promise<{
        id: string;
        name: string;
        code: string;
        systemDefined: boolean;
        requiresMembership: boolean;
    }[]>;
    findDeductionType(id: string): Promise<{
        id: string;
        name: string;
        code: string;
        systemDefined: boolean;
        requiresMembership: boolean;
    }>;
    createDeductionType(dto: CreateDeductionTypeDto, user?: User): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    updateDeductionType(user: User, dto: CreateDeductionTypeDto, id: string): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    deleteDeductionType(id: string, userId: string): Promise<string>;
    getEmployeeDeductions(employeeId: string): Promise<{
        id: string;
        employeeId: string;
        deductionTypeId: string;
        rateType: "fixed" | "percentage";
        rateValue: string;
        startDate: string;
        endDate: string | null;
        metadata: unknown;
        isActive: boolean;
    }[]>;
    assignDeductionToEmployee(user: User, dto: CreateEmployeeDeductionDto): Promise<{
        id: string;
        isActive: boolean;
        startDate: string;
        employeeId: string;
        endDate: string | null;
        deductionTypeId: string;
        rateType: "fixed" | "percentage";
        rateValue: string;
        metadata: unknown;
    }>;
    updateEmployeeDeduction(user: User, id: string, dto: UpdateEmployeeDeductionDto): Promise<{
        id: string;
        employeeId: string;
        deductionTypeId: string;
        rateType: "fixed" | "percentage";
        rateValue: string;
        startDate: string;
        endDate: string | null;
        metadata: unknown;
        isActive: boolean;
    }>;
    removeEmployeeDeduction(id: string, userId: string): Promise<{
        message: string;
    }>;
    getAllEmployeeDeductionsForCompany(companyId: string): Promise<({
        id: string;
        employeeId: string;
        rateType: "fixed" | "percentage";
        rateValue: string;
        deductionTypeName: string | null;
        isActive: boolean;
        startDate: string;
        endDate: string | null;
        employeeName: string;
    } | {
        id: string;
        employeeId: string;
        rateType: "fixed" | "percentage";
        rateValue: string;
        deductionTypeName: string | null;
        isActive: boolean;
        startDate: string;
        endDate: string | null;
        employeeName: string;
    })[]>;
    processVoluntaryDeductionsFromPayroll(payrollRecords: any[], payrollRunId: string, companyId: string): Promise<{
        inserted: number;
    }>;
}
