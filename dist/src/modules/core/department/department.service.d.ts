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
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "departments";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "departments";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            name: import("drizzle-orm/pg-core").PgColumn<{
                name: "name";
                tableName: "departments";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 255;
            }>;
            description: import("drizzle-orm/pg-core").PgColumn<{
                name: "description";
                tableName: "departments";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            companyId: import("drizzle-orm/pg-core").PgColumn<{
                name: "company_id";
                tableName: "departments";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            headId: import("drizzle-orm/pg-core").PgColumn<{
                name: "head_id";
                tableName: "departments";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            parentDepartmentId: import("drizzle-orm/pg-core").PgColumn<{
                name: "parent_department_id";
                tableName: "departments";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            costCenterId: import("drizzle-orm/pg-core").PgColumn<{
                name: "cost_center_id";
                tableName: "departments";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "departments";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            updatedAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "updated_at";
                tableName: "departments";
                dataType: "date";
                columnType: "PgTimestamp";
                data: Date;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    constructor(db: db, audit: AuditService, cache: CacheService, companySettings: CompanySettingsService);
    private ttlSeconds;
    private tags;
    create(companyId: string, dto: CreateDepartmentDto): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    bulkCreate(companyId: string, rows: any[]): Promise<{
        id: string;
        name: string;
        description: string | null;
    }[]>;
    findAll(companyId: string): Promise<({
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
    findOne(companyId: string, id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateDepartmentDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    remove(companyId: string, id: string): Promise<{
        id: string;
    }>;
    assignHead(companyId: string, departmentId: string, headId: string, userId: string, ip: string): Promise<{
        id: any;
    }>;
    findOneWithHead(companyId: string, id: string): Promise<{
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
    assignParent(companyId: string, departmentId: string, dto: AssignParentDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    assignCostCenter(companyId: string, departmentId: string, dto: AssignCostCenterDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    private parentDept;
    findOneWithRelations(companyId: string, id: string): Promise<never>;
    findAllWithRelations(companyId: string): Promise<never[]>;
    getHierarchy(companyId: string): Promise<(DeptWithRelations & {
        children: any[];
    })[]>;
}
export {};
