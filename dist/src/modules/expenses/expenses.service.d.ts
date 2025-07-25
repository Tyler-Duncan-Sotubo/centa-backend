import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { User } from 'src/common/types/user.type';
import { AwsService } from 'src/common/aws/aws.service';
import { ExpensesSettingsService } from './settings/expense-settings.service';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';
export declare class ExpensesService {
    private readonly db;
    private readonly auditService;
    private awsService;
    private readonly expenseSettingsService;
    private readonly awsStorage;
    private readonly pusher;
    constructor(db: db, auditService: AuditService, awsService: AwsService, expenseSettingsService: ExpensesSettingsService, awsStorage: S3StorageService, pusher: PusherService);
    private exportAndUploadExcel;
    private exportAndUpload;
    handleExpenseApprovalFlow(expenseId: string, user: User): Promise<void>;
    create(dto: CreateExpenseDto, user: User): Promise<{
        date: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        category: string;
        employeeId: string;
        status: string;
        submittedAt: Date | null;
        amount: string;
        rejectionReason: string | null;
        purpose: string;
        receiptUrl: string | null;
        paymentMethod: string | null;
        deletedAt: Date | null;
    }>;
    bulkCreateExpenses(companyId: string, rows: any[], user: User): Promise<{
        date: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        category: string;
        employeeId: string;
        status: string;
        submittedAt: Date | null;
        amount: string;
        rejectionReason: string | null;
        purpose: string;
        receiptUrl: string | null;
        paymentMethod: string | null;
        deletedAt: Date | null;
    }[]>;
    findAll(companyId: string): Omit<import("drizzle-orm/pg-core").PgSelectBase<"expenses", {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "expenses";
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
        date: import("drizzle-orm/pg-core").PgColumn<{
            name: "date";
            tableName: "expenses";
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
        submittedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "submitted_at";
            tableName: "expenses";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
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
        category: import("drizzle-orm/pg-core").PgColumn<{
            name: "category";
            tableName: "expenses";
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
        purpose: import("drizzle-orm/pg-core").PgColumn<{
            name: "purpose";
            tableName: "expenses";
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
        amount: import("drizzle-orm/pg-core").PgColumn<{
            name: "amount";
            tableName: "expenses";
            dataType: "string";
            columnType: "PgNumeric";
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
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "expenses";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        paymentMethod: import("drizzle-orm/pg-core").PgColumn<{
            name: "payment_method";
            tableName: "expenses";
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
        receiptUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "receipt_url";
            tableName: "expenses";
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
        requester: import("drizzle-orm").SQL<string>;
        employeeId: import("drizzle-orm/pg-core").PgColumn<{
            name: "employee_id";
            tableName: "expenses";
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
        approvedBy: import("drizzle-orm").SQL<string>;
    }, "partial", ((Record<"expenses", "not-null"> | (Record<"expenses", "not-null"> & {
        [x: string]: "nullable";
    })) & {
        latest_approvals: "nullable";
    }) & {
        users: "nullable";
    }, false, "where" | "orderBy", ({
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
    } | {
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
    })[], {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "expenses";
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
        date: import("drizzle-orm/pg-core").PgColumn<{
            name: "date";
            tableName: "expenses";
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
        submittedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "submitted_at";
            tableName: "expenses";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
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
        category: import("drizzle-orm/pg-core").PgColumn<{
            name: "category";
            tableName: "expenses";
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
        purpose: import("drizzle-orm/pg-core").PgColumn<{
            name: "purpose";
            tableName: "expenses";
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
        amount: import("drizzle-orm/pg-core").PgColumn<{
            name: "amount";
            tableName: "expenses";
            dataType: "string";
            columnType: "PgNumeric";
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
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "expenses";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        paymentMethod: import("drizzle-orm/pg-core").PgColumn<{
            name: "payment_method";
            tableName: "expenses";
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
        receiptUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "receipt_url";
            tableName: "expenses";
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
        requester: import("drizzle-orm").DrizzleTypeError<"You cannot reference this field without assigning it an alias first - use `.as(<alias>)`">;
        employeeId: import("drizzle-orm/pg-core").PgColumn<{
            name: "employee_id";
            tableName: "expenses";
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
        approvedBy: import("drizzle-orm").DrizzleTypeError<"You cannot reference this field without assigning it an alias first - use `.as(<alias>)`">;
    }>, "where" | "orderBy">;
    findAllByEmployeeId(employeeId: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        date: string;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        submittedAt: Date | null;
        receiptUrl: string | null;
        paymentMethod: string | null;
        rejectionReason: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        deletedAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        date: string;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        submittedAt: Date | null;
        receiptUrl: string | null;
        paymentMethod: string | null;
        rejectionReason: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        deletedAt: Date | null;
    }>;
    update(id: string, dto: UpdateExpenseDto, user: User): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        date: string;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        submittedAt: Date | null;
        receiptUrl: string | null;
        paymentMethod: string | null;
        rejectionReason: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        deletedAt: Date | null;
    }>;
    checkApprovalStatus(expenseId: string, user?: User): Promise<{
        expenseDate: string;
        approvalStatus: string;
        steps: {
            fallbackRoles: any;
            isUserEligible: any;
            isFallback: any;
            id: string;
            sequence: number;
            role: string;
            minApprovals: number;
            maxApprovals: number;
            createdAt: Date | null;
            status: string;
        }[];
    }>;
    handleExpenseApprovalAction(expenseId: string, user: User, action: 'approved' | 'rejected', remarks?: string): Promise<string>;
    remove(id: string, user: User): Promise<{
        success: boolean;
        id: string;
    }>;
    generateReimbursementReport(companyId: string, filters?: {
        fromDate?: string;
        toDate?: string;
        employeeId?: string;
        status?: 'requested' | 'pending' | 'approved' | 'rejected' | 'all' | 'paid';
    }): Promise<({
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
        approvalDate: Date | null;
    } | {
        id: string;
        date: string;
        submittedAt: Date | null;
        category: string;
        purpose: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        receiptUrl: string | null;
        requester: string;
        employeeId: string;
        approvedBy: string;
        approvalDate: Date | null;
    })[]>;
    generateReimbursementReportToS3(companyId: string, format?: 'excel' | 'csv', filters?: {
        fromDate?: string;
        toDate?: string;
        employeeId?: string;
        status?: 'requested' | 'pending' | 'approved' | 'rejected' | 'paid' | 'all';
    }): Promise<{
        url: string;
        record: any;
    } | undefined>;
}
