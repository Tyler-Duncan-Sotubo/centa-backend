"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customDeductions = exports.taxConfig = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
const employee_schema_1 = require("./employee.schema");
exports.taxConfig = (0, pg_core_1.pgTable)('tax_config', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    apply_paye: (0, pg_core_1.boolean)('apply_paye').default(false),
    apply_nhf: (0, pg_core_1.boolean)('apply_nhf').default(false),
    apply_pension: (0, pg_core_1.boolean)('apply_pension').default(false),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
});
exports.customDeductions = (0, pg_core_1.pgTable)('custom_deductions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    deduction_name: (0, pg_core_1.text)('deduction_name').notNull(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    deduction_date: (0, pg_core_1.timestamp)('deduction_date').defaultNow(),
});
//# sourceMappingURL=deductions.schema.js.map