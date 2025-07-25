import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class HistoryService {
    private readonly db;
    private readonly auditService;
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "employee_history";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "employee_history";
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
            employeeId: import("drizzle-orm/pg-core").PgColumn<{
                name: "employee_id";
                tableName: "employee_history";
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
            type: import("drizzle-orm/pg-core").PgColumn<{
                name: "type";
                tableName: "employee_history";
                dataType: "string";
                columnType: "PgEnumColumn";
                data: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["employment", "education", "certification", "promotion", "transfer", "termination"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            title: import("drizzle-orm/pg-core").PgColumn<{
                name: "title";
                tableName: "employee_history";
                dataType: "string";
                columnType: "PgText";
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
            }, {}, {}>;
            startDate: import("drizzle-orm/pg-core").PgColumn<{
                name: "start_date";
                tableName: "employee_history";
                dataType: "string";
                columnType: "PgDateString";
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
            endDate: import("drizzle-orm/pg-core").PgColumn<{
                name: "end_date";
                tableName: "employee_history";
                dataType: "string";
                columnType: "PgDateString";
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
            institution: import("drizzle-orm/pg-core").PgColumn<{
                name: "institution";
                tableName: "employee_history";
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
            description: import("drizzle-orm/pg-core").PgColumn<{
                name: "description";
                tableName: "employee_history";
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
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "employee_history";
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
    constructor(db: db, auditService: AuditService);
    create(employeeId: string, dto: CreateHistoryDto, userId: string, ip: string): Promise<{
        id: string;
        createdAt: Date;
        type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
        description: string | null;
        title: string;
        startDate: string | null;
        employeeId: string;
        endDate: string | null;
        institution: string | null;
    }>;
    findAll(employeeId: string): Promise<{
        id: string;
        employeeId: string;
        type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
        title: string;
        startDate: string | null;
        endDate: string | null;
        institution: string | null;
        description: string | null;
        createdAt: Date;
    }[]>;
    findOne(historyId: string): Promise<{}>;
    update(historyId: string, dto: UpdateHistoryDto, userId: string, ip: string): Promise<{
        id: string;
        employeeId: string;
        type: "employment" | "education" | "certification" | "promotion" | "transfer" | "termination";
        title: string;
        startDate: string | null;
        endDate: string | null;
        institution: string | null;
        description: string | null;
        createdAt: Date;
    } | undefined>;
    remove(historyId: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
}
