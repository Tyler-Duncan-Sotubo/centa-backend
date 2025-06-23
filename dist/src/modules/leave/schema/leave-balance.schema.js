"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveBalances = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("./leave-types.schema");
exports.leaveBalances = (0, pg_core_1.pgTable)('leave_balances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    leaveTypeId: (0, pg_core_1.uuid)('leave_type_id')
        .notNull()
        .references(() => leave_types_schema_1.leaveTypes.id, { onDelete: 'cascade' }),
    year: (0, pg_core_1.integer)('year').notNull(),
    entitlement: (0, pg_core_1.decimal)('entitlement', { precision: 5, scale: 2 })
        .notNull()
        .default('0.00'),
    used: (0, pg_core_1.decimal)('used', { precision: 5, scale: 2 }).notNull().default('0.00'),
    balance: (0, pg_core_1.decimal)('balance', { precision: 5, scale: 2 })
        .notNull()
        .default('0.00'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.unique)('unique_leave_balance').on(t.employeeId, t.leaveTypeId, t.year),
    (0, pg_core_1.index)('leave_balances_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('leave_balances_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('leave_balances_leave_type_id_idx').on(t.leaveTypeId),
    (0, pg_core_1.index)('leave_balances_year_idx').on(t.year),
]);
//# sourceMappingURL=leave-balance.schema.js.map