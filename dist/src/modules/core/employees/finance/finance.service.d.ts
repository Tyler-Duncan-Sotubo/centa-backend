import { CreateFinanceDto } from './dto/create-finance.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { ConfigService } from '@nestjs/config';
export declare class FinanceService {
    private readonly db;
    private readonly auditService;
    private readonly config;
    protected table: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "employee_financials";
        schema: undefined;
        columns: {
            employeeId: import("drizzle-orm/pg-core").PgColumn<{
                name: "employee_id";
                tableName: "employee_financials";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            bankName: import("drizzle-orm/pg-core").PgColumn<{
                name: "bank_name";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            bankAccountNumber: import("drizzle-orm/pg-core").PgColumn<{
                name: "bank_account_number";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            bankAccountName: import("drizzle-orm/pg-core").PgColumn<{
                name: "bank_account_name";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            bankBranch: import("drizzle-orm/pg-core").PgColumn<{
                name: "bank_branch";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            currency: import("drizzle-orm/pg-core").PgColumn<{
                name: "currency";
                tableName: "employee_financials";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: 3;
            }>;
            tin: import("drizzle-orm/pg-core").PgColumn<{
                name: "tin";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            pensionPin: import("drizzle-orm/pg-core").PgColumn<{
                name: "pension_pin";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            nhfNumber: import("drizzle-orm/pg-core").PgColumn<{
                name: "nhf_number";
                tableName: "employee_financials";
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
                length: 200;
            }>;
            createdAt: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "employee_financials";
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
                tableName: "employee_financials";
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
    constructor(db: db, auditService: AuditService, config: ConfigService);
    upsert(employeeId: string, dto: CreateFinanceDto, userId: string, ip: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        currency: string | null;
        employeeId: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        bankBranch: string | null;
        tin: string | null;
        pensionPin: string | null;
        nhfNumber: string | null;
    }>;
    findOne(employeeId: string): Promise<{}>;
    remove(employeeId: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
    verifyBankAccount(accountNumber: string, bankCode: string): Promise<unknown>;
}
