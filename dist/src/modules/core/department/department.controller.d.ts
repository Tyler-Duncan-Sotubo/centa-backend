import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { User } from 'src/common/types/user.type';
import { AssignHeadDto } from './dto/assign-head.dto';
import { AssignCostCenterDto } from './dto/assign-cost-center.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class DepartmentController extends BaseController {
    private readonly departmentService;
    constructor(departmentService: DepartmentService);
    create(user: User, createDepartmentDto: CreateDepartmentDto): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    bulkCreate(rows: any[], user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    findAll(user: User): Promise<({
        head: {
            id: any;
            name: unknown;
            email: any;
            avatarUrl: string | null;
        } | null;
        employees: any[];
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
    } | {
        head: {
            id: any;
            name: unknown;
            email: any;
            avatarUrl: string | null;
        } | null;
        employees: any[];
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
    })[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto, user: User, ip: string): Promise<{
        id: any;
    }>;
    remove(id: string, user: User): Promise<{
        id: string;
    }>;
    assignHead(id: string, dto: AssignHeadDto, user: User, ip: string): Promise<{
        id: any;
    }>;
    getDepartmentHead(id: string, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        head: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        };
    } | {
        id: string;
        name: string;
        description: string | null;
        head: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | null;
    }>;
    assignParent(user: User, id: string, dto: AssignParentDto, ip: string): Promise<{
        id: any;
    }>;
    assignCostCenter(user: User, id: string, dto: AssignCostCenterDto, ip: string): Promise<{
        id: any;
    }>;
    getHierarchy(user: User): Promise<({
        id: string;
        name: string;
        description: string | null;
        head?: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        parent?: {
            id: string;
            name: string;
        } | null;
        costCenter?: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } & {
        children: any[];
    })[]>;
}
