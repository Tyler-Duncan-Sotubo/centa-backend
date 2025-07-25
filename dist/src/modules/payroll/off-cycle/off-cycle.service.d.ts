import { CreateOffCycleDto } from './dto/create-off-cycle.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { PayrollSettingsService } from '../settings/payroll-settings.service';
export declare class OffCycleService {
    private db;
    private auditService;
    private readonly payrollSettingsService;
    constructor(db: db, auditService: AuditService, payrollSettingsService: PayrollSettingsService);
    private calculatePAYE;
    private calculateOffCyclePayroll;
    calculateAndPersistOffCycle(runId: string, user: User, payrollDate: string): Promise<{
        name: string;
        transport: string;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        userId: string | null;
        employeeId: string;
        workflowId: string;
        grossSalary: string;
        payrollRunId: string;
        basic: string;
        housing: string;
        pensionContribution: string;
        employerPensionContribution: string;
        bonuses: string | null;
        reimbursements: unknown;
        salaryAdvance: string | null;
        nhfContribution: string | null;
        payeTax: string;
        customDeductions: string | null;
        voluntaryDeductions: unknown;
        totalDeductions: string;
        netSalary: string;
        taxableIncome: string;
        payrollDate: string;
        payrollMonth: string;
        paymentStatus: string | null;
        paymentDate: string | null;
        paymentReference: string | null;
        approvalDate: string | null;
        approvalRemarks: string | null;
        isStarter: boolean | null;
        isLeaver: boolean | null;
        isOffCycle: boolean | null;
        requestedBy: string;
        requestedAt: Date;
        approvalStatus: string;
        lastApprovalAt: Date | null;
        lastApprovedBy: string | null;
        currentStep: number;
    }[]>;
    create(createOffCycleDto: CreateOffCycleDto, user: User): Promise<({
        id: string;
        employeeId: string;
        type: string;
        amount: string;
        taxable: boolean;
        proratable: boolean;
        payrollDate: string;
        notes: string | null;
        payrollRunId: string;
        name: string;
    } | {
        id: string;
        employeeId: string;
        type: string;
        amount: string;
        taxable: boolean;
        proratable: boolean;
        payrollDate: string;
        notes: string | null;
        payrollRunId: string;
        name: string;
    })[]>;
    findAll(companyId: string, payrollDate: string): Omit<import("drizzle-orm/pg-core").PgSelectBase<"off_cycle_payroll", {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "off_cycle_payroll";
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
            tableName: "off_cycle_payroll";
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
            tableName: "off_cycle_payroll";
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
            tableName: "off_cycle_payroll";
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
        taxable: import("drizzle-orm/pg-core").PgColumn<{
            name: "taxable";
            tableName: "off_cycle_payroll";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
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
        proratable: import("drizzle-orm/pg-core").PgColumn<{
            name: "proratable";
            tableName: "off_cycle_payroll";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
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
        payrollDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "payroll_date";
            tableName: "off_cycle_payroll";
            dataType: "string";
            columnType: "PgDateString";
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
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "off_cycle_payroll";
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
        payrollRunId: import("drizzle-orm/pg-core").PgColumn<{
            name: "payroll_run_id";
            tableName: "off_cycle_payroll";
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
        name: import("drizzle-orm").SQL<string>;
    }, "partial", Record<"off_cycle_payroll", "not-null"> | (Record<"off_cycle_payroll", "not-null"> & {
        [x: string]: "not-null";
    }), false, "where", ({
        id: string;
        employeeId: string;
        type: string;
        amount: string;
        taxable: boolean;
        proratable: boolean;
        payrollDate: string;
        notes: string | null;
        payrollRunId: string;
        name: string;
    } | {
        id: string;
        employeeId: string;
        type: string;
        amount: string;
        taxable: boolean;
        proratable: boolean;
        payrollDate: string;
        notes: string | null;
        payrollRunId: string;
        name: string;
    })[], {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "off_cycle_payroll";
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
            tableName: "off_cycle_payroll";
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
            tableName: "off_cycle_payroll";
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
            tableName: "off_cycle_payroll";
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
        taxable: import("drizzle-orm/pg-core").PgColumn<{
            name: "taxable";
            tableName: "off_cycle_payroll";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
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
        proratable: import("drizzle-orm/pg-core").PgColumn<{
            name: "proratable";
            tableName: "off_cycle_payroll";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
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
        payrollDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "payroll_date";
            tableName: "off_cycle_payroll";
            dataType: "string";
            columnType: "PgDateString";
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
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "off_cycle_payroll";
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
        payrollRunId: import("drizzle-orm/pg-core").PgColumn<{
            name: "payroll_run_id";
            tableName: "off_cycle_payroll";
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
        name: import("drizzle-orm").DrizzleTypeError<"You cannot reference this field without assigning it an alias first - use `.as(<alias>)`">;
    }>, "where">;
    findOne(id: string): Promise<{
        id: string;
        payrollRunId: string;
        companyId: string;
        employeeId: string;
        type: string;
        amount: string;
        taxable: boolean;
        proratable: boolean;
        notes: string | null;
        payrollDate: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string, user: User): Promise<void>;
}
