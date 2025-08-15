import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { jobRoles } from '../schema';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class JobRolesService extends BaseCrudService<{
    title: string;
    level?: string;
    description?: string;
}, typeof jobRoles> {
    private readonly companySettings;
    private readonly cache;
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "job_roles";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "job_roles";
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
            title: import("drizzle-orm/pg-core").PgColumn<{
                name: "title";
                tableName: "job_roles";
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
            level: import("drizzle-orm/pg-core").PgColumn<{
                name: "level";
                tableName: "job_roles";
                dataType: "string";
                columnType: "PgVarchar";
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
            }, {}, {
                length: 100;
            }>;
            description: import("drizzle-orm/pg-core").PgColumn<{
                name: "description";
                tableName: "job_roles";
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
                tableName: "job_roles";
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
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "job_roles";
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
                tableName: "job_roles";
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
    constructor(db: db, audit: AuditService, companySettings: CompanySettingsService, cache: CacheService);
    private tags;
    create(companyId: string, dto: CreateJobRoleDto): Promise<{
        id: string;
    }>;
    bulkCreate(companyId: string, rows: any[]): Promise<{
        id: string;
        title: string;
    }[]>;
    findAll(companyId: string): Promise<{
        id: string;
        title: string;
        level: string | null;
        description: string | null;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(companyId: string, id: string): Promise<{
        id: string;
        title: string;
        level: string | null;
        description: string | null;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(companyId: string, id: string, dto: UpdateJobRoleDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    remove(companyId: string, id: string): Promise<{
        id: string;
    }>;
}
