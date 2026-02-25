import { CompensationService } from './compensation.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class CompensationController extends BaseController {
    private readonly compensationService;
    constructor(compensationService: CompensationService);
    create(employeeId: string, dto: CreateCompensationDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        currency: string;
        payFrequency: string;
        employeeId: string;
        grossSalary: number;
        effectiveDate: string;
        applyNHf: boolean;
    }>;
    findAll(id: string): Promise<{
        id: string;
        employeeId: string;
        grossSalary: number;
        payGroupId: any;
        applyNhf: boolean;
        startDate: any;
        endDate: any;
    } | {
        id: string;
        employeeId: string;
        grossSalary: number;
        payGroupId: any;
        applyNhf: boolean;
        startDate: any;
        endDate: any;
    }>;
    findOne(id: string): Promise<{
        id: string;
        employeeId: string;
        grossSalary: number;
        payGroupId: any;
        applyNhf: boolean;
    } | {
        id: string;
        employeeId: string;
        grossSalary: number;
        payGroupId: any;
        applyNhf: boolean;
    }>;
    update(id: string, dto: UpdateCompensationDto, user: User, ip: string): Promise<{
        id: string;
        employeeId: string;
        effectiveDate: string;
        grossSalary: number;
        currency: string;
        payFrequency: string;
        applyNHf: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
}
