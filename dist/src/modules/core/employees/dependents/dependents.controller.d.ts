import { DependentsService } from './dependents.service';
import { CreateDependentDto } from './dto/create-dependent.dto';
import { UpdateDependentDto } from './dto/update-dependent.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class DependentsController extends BaseController {
    private readonly dependentsService;
    constructor(dependentsService: DependentsService);
    create(employeeId: string, dto: CreateDependentDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        employeeId: string;
        dateOfBirth: string;
        relationship: string;
        isBeneficiary: boolean | null;
    }>;
    findAll(id: string): Promise<{
        id: string;
        employeeId: string;
        name: string;
        relationship: string;
        dateOfBirth: string;
        isBeneficiary: boolean | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{}>;
    update(id: string, dto: UpdateDependentDto, user: User, ip: string): Promise<{
        id: string;
        employeeId: string;
        name: string;
        relationship: string;
        dateOfBirth: string;
        isBeneficiary: boolean | null;
        createdAt: Date;
    } | undefined>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
}
