"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.expenses = (0, pg_core_1.pgTable)('expenses', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.text)('date').notNull(),
    category: (0, pg_core_1.text)('category').notNull(),
    purpose: (0, pg_core_1.text)('purpose').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 10, scale: 2 }).notNull(),
    status: (0, pg_core_1.text)('status').default('Requested').notNull(),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at', { withTimezone: true }),
    receiptUrl: (0, pg_core_1.text)('receipt_url'),
    paymentMethod: (0, pg_core_1.text)('payment_method'),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('expenses_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('expenses_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('expenses_date_idx').on(t.date),
    (0, pg_core_1.index)('expenses_category_idx').on(t.category),
    (0, pg_core_1.index)('expenses_status_idx').on(t.status),
    (0, pg_core_1.index)('expenses_submitted_at_idx').on(t.submittedAt),
    (0, pg_core_1.index)('expenses_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=expense.schema.js.map