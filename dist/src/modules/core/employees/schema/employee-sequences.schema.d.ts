export declare const employeeSequences: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "employee_sequences";
    schema: undefined;
    columns: {
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "employee_sequences";
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
        nextNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "next_number";
            tableName: "employee_sequences";
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
    };
    dialect: "pg";
}>;
