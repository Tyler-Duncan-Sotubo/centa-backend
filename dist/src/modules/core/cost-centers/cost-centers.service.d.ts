import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { costCenters } from '../schema';
import { User } from 'src/common/types/user.type';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class CostCentersService extends BaseCrudService<{
    code: string;
    name: string;
    budget: number;
}, typeof costCenters> {
    private readonly companySettings;
    private readonly cache;
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "cost_centers";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "cost_centers";
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
            companyId: import("drizzle-orm/pg-core").PgColumn<{
                name: "company_id";
                tableName: "cost_centers";
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
            code: import("drizzle-orm/pg-core").PgColumn<{
                name: "code";
                tableName: "cost_centers";
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
                length: 20;
            }>;
            name: import("drizzle-orm/pg-core").PgColumn<{
                name: "name";
                tableName: "cost_centers";
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
            budget: import("drizzle-orm/pg-core").PgColumn<{
                name: "budget";
                tableName: "cost_centers";
                dataType: "number";
                columnType: "PgInteger";
                data: number;
                driverParam: string | number;
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
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "cost_centers";
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
                tableName: "cost_centers";
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
    create(companyId: string, dto: CreateCostCenterDto): Promise<{
        id: string;
    }>;
    bulkCreate(companyId: string, rows: any[]): Promise<{
        id: string;
        code: string;
        name: string;
        budget: number;
    }[]>;
    findAll(companyId: string): Promise<{
        id: string;
        code: string;
        name: string;
        budget: number;
    }[]>;
    findOne(companyId: string, id: string): Promise<{
        id: string;
        code: string;
        name: string;
        budget: number;
    }>;
    update(companyId: string, id: string, dto: UpdateCostCenterDto, userId: string, ip: string): Promise<{
        id: any;
    }>;
    remove(user: User, id: string): Promise<{
        id: string;
    }>;
}
