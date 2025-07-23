export declare const offerLetterTemplateVariableLinks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "offer_letter_template_variable_links";
    schema: undefined;
    columns: {
        templateId: import("drizzle-orm/pg-core").PgColumn<{
            name: "template_id";
            tableName: "offer_letter_template_variable_links";
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
        variableId: import("drizzle-orm/pg-core").PgColumn<{
            name: "variable_id";
            tableName: "offer_letter_template_variable_links";
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
    };
    dialect: "pg";
}>;
