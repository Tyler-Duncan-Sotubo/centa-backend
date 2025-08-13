import { DeductionsService } from './deductions.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateDeductionTypeDto } from './dto/create-deduction-type.dto';
import { CreateEmployeeDeductionDto } from './dto/create-employee-deduction.dto';
export declare class DeductionsController extends BaseController {
    private readonly deductionsService;
    constructor(deductionsService: DeductionsService);
    createDeductionType(createDeductionTypeDto: CreateDeductionTypeDto, user: User): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    findAllDeductionTypes(): Promise<{
        id: string;
        name: string;
        code: string;
        systemDefined: boolean;
        requiresMembership: boolean;
    }[]>;
    updateDeductionType(user: User, deductionTypeId: string, updateDeductionTypeDto: CreateDeductionTypeDto): Promise<{
        id: string;
        name: string;
        code: string;
    }>;
    removeDeductionType(deductionTypeId: string, user: User): Promise<string>;
    assignDeductionToEmployee(dto: CreateEmployeeDeductionDto, user: User): Promise<{
        id: string;
        isActive: boolean;
        startDate: string;
        endDate: string | null;
        employeeId: string;
        metadata: unknown;
        deductionTypeId: string;
        rateType: "fixed" | "percentage";
        rateValue: string;
    }>;
    getAllEmployeeDeductionsForCompany(user: User): Promise<({
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
    updateEmployeeDeduction(employeeDeductionId: string, dto: CreateEmployeeDeductionDto, user: User): Promise<{
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
    removeEmployeeDeduction(employeeDeductionId: string, user: User): Promise<{
        message: string;
    }>;
}
