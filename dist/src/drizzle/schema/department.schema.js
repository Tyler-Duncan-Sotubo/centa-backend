"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    head_of_department: (0, pg_core_1.uuid)('head_of_department'),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => [(0, pg_core_1.index)('idx_company_id_departments').on(table.company_id)]);
//# sourceMappingURL=department.schema.js.map