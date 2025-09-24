"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaryAdvanceHistory = exports.repayments = exports.salaryAdvance = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.salaryAdvance = (0, pg_core_1.pgTable)('salary_advance', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    loanNumber: (0, pg_core_1.text)('loan_number'),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id, { onDelete: 'cascade' })
        .notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .references(() => schema_1.employees.id)
        .notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 15, scale: 2 }).notNull(),
    totalPaid: (0, pg_core_1.decimal)('total_paid', { precision: 15, scale: 2 })
        .default('0.00')
        .notNull(),
    tenureMonths: (0, pg_core_1.integer)('tenure_months').notNull(),
    preferredMonthlyPayment: (0, pg_core_1.decimal)('preferred_monthly_payment', {
        precision: 15,
        scale: 2,
    }).default('0.00'),
    status: (0, pg_core_1.text)('status').default('pending').notNull(),
    paymentStatus: (0, pg_core_1.text)('payment_status').default('open').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_loans').on(table.companyId),
    (0, pg_core_1.index)('idx_employee_id_loans').on(table.employeeId),
    (0, pg_core_1.index)('idx_status_loans').on(table.status),
]);
exports.repayments = (0, pg_core_1.pgTable)('repayments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    salaryAdvanceId: (0, pg_core_1.uuid)('loan_id')
        .references(() => exports.salaryAdvance.id)
        .notNull(),
    amountPaid: (0, pg_core_1.decimal)('amount_paid', { precision: 15, scale: 2 }).notNull(),
    paidAt: (0, pg_core_1.timestamp)('paid_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_loan_id_repayments').on(table.salaryAdvanceId),
    (0, pg_core_1.index)('idx_paid_at_repayments').on(table.paidAt),
]);
exports.salaryAdvanceHistory = (0, pg_core_1.pgTable)('salary_advance_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id, { onDelete: 'cascade' })
        .notNull(),
    salaryAdvanceId: (0, pg_core_1.uuid)('loan_id')
        .references(() => exports.salaryAdvance.id)
        .notNull(),
    action: (0, pg_core_1.text)('action').notNull(),
    reason: (0, pg_core_1.text)('reason'),
    actionBy: (0, pg_core_1.uuid)('action_by').references(() => schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_loan_history').on(table.companyId),
    (0, pg_core_1.index)('idx_loan_id_loan_history').on(table.salaryAdvanceId),
    (0, pg_core_1.index)('idx_action_loan_history').on(table.action),
    (0, pg_core_1.index)('idx_created_at_loan_history').on(table.createdAt),
]);
//# sourceMappingURL=salary-advance.schema.js.map