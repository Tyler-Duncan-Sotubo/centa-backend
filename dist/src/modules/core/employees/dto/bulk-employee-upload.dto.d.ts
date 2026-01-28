import { employeeStatus } from '../../schema';
import { CreateFinanceDto } from '../finance/dto/create-finance.dto';
import { CreateCompensationDto } from '../compensation/dto/create-compensation.dto';
export declare class BulkEmployeeDto {
    userId: string;
    employeeNumber: string;
    departmentId?: string;
    jobRoleId?: string;
    payGroupId?: string;
    costCenterId?: string | null;
    employmentStatus?: keyof typeof employeeStatus;
    firstName: string;
    lastName: string;
    email: string;
    companyId: string;
    finance: CreateFinanceDto;
    compensation: CreateCompensationDto;
}
export declare class BulkEmployeeUploadDto {
    employees: BulkEmployeeDto[];
}
