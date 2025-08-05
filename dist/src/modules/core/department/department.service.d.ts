import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AssignCostCenterDto } from './dto/assign-cost-center.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { departments } from 'src/drizzle/schema';
type DeptWithRelations = {
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
};
export declare class DepartmentService extends BaseCrudService<UpdateDepartmentDto & {
    parentDepartmentId?: string;
    headId?: string;
    costCenterId?: string;
}, typeof departments> {
    private readonly cache;
    private readonly companySettings;
    protected table: any;
    constructor(db: db, audit: AuditService, cache: CacheService, companySettings: CompanySettingsService);
    create(companyId: string, dto: CreateDepartmentDto): Promise<{
        id: any;
        name: any;
        description: any;
    }>;
    bulkCreate(companyId: string, rows: any[]): Promise<{
        id: any;
        name: any;
        description: any;
    }[]>;
    findAll(companyId: string): Promise<({
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
    findOne(companyId: string, id: string): Promise<{
        id: any;
        name: any;
        description: any;
    } | {
        id: any;
        name: any;
        description: any;
    }>;
    update(companyId: string, id: string, dto: UpdateDepartmentDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    remove(companyId: string, id: string): Promise<{
        id: any;
    }>;
    assignHead(companyId: string, departmentId: string, headId: string, userId: string, ip: string): Promise<{
        id: any;
    }>;
    findOneWithHead(companyId: string, id: string): Promise<{
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
    assignParent(companyId: string, departmentId: string, dto: AssignParentDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    assignCostCenter(companyId: string, departmentId: string, dto: AssignCostCenterDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    private parentDept;
    findOneWithRelations(companyId: string, id: string): Promise<{
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        };
        parent: {
            id: any;
            name: any;
        };
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        };
        parent: {
            id: any;
            name: any;
        };
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        } | null;
        parent: {
            id: any;
            name: any;
        } | null;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: never;
        parent: never;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        } | null;
        parent: {
            id: any;
            name: any;
        } | null;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: never;
        parent: never;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    }>;
    findAllWithRelations(companyId: string): Promise<({
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        };
        parent: {
            id: any;
            name: any;
        };
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        };
        parent: {
            id: any;
            name: any;
        };
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        } | null;
        parent: {
            id: any;
            name: any;
        } | null;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: never;
        parent: never;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: {
            id: any;
            firstName: any;
            lastName: any;
        } | null;
        parent: {
            id: any;
            name: any;
        } | null;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    } | {
        id: any;
        name: any;
        description: any;
        head: never;
        parent: never;
        costCenter: {
            id: string;
            code: string;
            name: string;
            budget: number;
        } | null;
    })[]>;
    getHierarchy(companyId: string): Promise<(DeptWithRelations & {
        children: any[];
    })[]>;
}
export {};
