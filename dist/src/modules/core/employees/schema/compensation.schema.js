"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeCompensations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.employeeCompensations = (0, pg_core_1.pgTable)('employee_compensations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    effectiveDate: (0, pg_core_1.text)('effective_date').notNull(),
    grossSalary: (0, pg_core_1.bigint)('gross_salary', { mode: 'number' }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('NGN'),
    payFrequency: (0, pg_core_1.varchar)('pay_frequency', { length: 20 })
        .notNull()
        .default('Monthly'),
    applyNHf: (0, pg_core_1.boolean)('apply_nhf').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_compensations_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_compensations_effective_date_idx').on(t.effectiveDate),
    (0, pg_core_1.index)('employee_compensations_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=compensation.schema.js.map