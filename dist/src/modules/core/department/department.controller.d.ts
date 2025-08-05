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
        id: any;
        name: any;
        description: any;
    }>;
    bulkCreate(rows: any[], user: User): Promise<{
        id: any;
        name: any;
        description: any;
    }[]>;
    findAll(user: User): Promise<({
        head: {
            id: any;
            name: unknown;
            email: any;
            avatarUrl: string | null;
        } | null;
        employees: any;
        id: any;
        name: any;
        description: any;
        createdAt: any;
    } | {
        head: {
            id: any;
            name: unknown;
            email: any;
            avatarUrl: string | null;
        } | null;
        employees: any;
        id: any;
        name: any;
        description: any;
        createdAt: any;
    } | {
        head: {
            id: any;
            name: unknown;
            email: any;
            avatarUrl: string | null;
        } | null;
        employees: any;
        id: any;
        name: any;
        description: any;
        createdAt: any;
    } | {
        head: {
            id: any;
            name: unknown;
            email: any;
            avatarUrl: string | null;
        } | null;
        employees: any;
        id: any;
        name: any;
        description: any;
        createdAt: any;
    })[]>;
    findOne(id: string, user: User): Promise<{
        id: any;
        name: any;
        description: any;
    } | {
        id: any;
        name: any;
        description: any;
    }>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto, user: User, ip: string): Promise<{
        id: any;
    }>;
    remove(id: string, user: User): Promise<{
        id: any;
    }>;
    assignHead(id: string, dto: AssignHeadDto, user: User, ip: string): Promise<{
        id: any;
    }>;
    getDepartmentHead(id: string, user: User): Promise<{
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        };
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        };
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: never;
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
