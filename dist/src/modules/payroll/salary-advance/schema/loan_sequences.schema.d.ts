export declare const loanSequences: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "loan_sequences";
    schema: undefined;
    columns: {
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "loan_sequences";
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
            tableName: "loan_sequences";
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
