"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaryAdvanceHistory = exports.repayments = exports.salaryAdvance = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
const company_schema_1 = require("./company.schema");
const users_schema_1 = require("./users.schema");
exports.salaryAdvance = (0, pg_core_1.pgTable)('salary_advance', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .references(() => company_schema_1.companies.id)
        .notNull(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .references(() => employee_schema_1.employees.id)
        .notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    total_paid: (0, pg_core_1.integer)('total_paid').default(0).notNull(),
    tenureMonths: (0, pg_core_1.integer)('tenure_months').notNull(),
    preferredMonthlyPayment: (0, pg_core_1.integer)('preferred_monthly_payment').default(0),
    status: (0, pg_core_1.text)('status').default('pending').notNull(),
    payment_status: (0, pg_core_1.text)('payment_status').default('open').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_loans').on(table.company_id),
    (0, pg_core_1.index)('idx_employee_id_loans').on(table.employee_id),
    (0, pg_core_1.index)('idx_status_loans').on(table.status),
]);
exports.repayments = (0, pg_core_1.pgTable)('repayments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    salary_advance_id: (0, pg_core_1.uuid)('loan_id')
        .references(() => exports.salaryAdvance.id)
        .notNull(),
    amount_paid: (0, pg_core_1.integer)('amount_paid').notNull(),
    paidAt: (0, pg_core_1.timestamp)('paid_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_loan_id_repayments').on(table.salary_advance_id),
    (0, pg_core_1.index)('idx_paid_at_repayments').on(table.paidAt),
]);
exports.salaryAdvanceHistory = (0, pg_core_1.pgTable)('salary_advance_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .references(() => company_schema_1.companies.id)
        .notNull(),
    salaryAdvance_id: (0, pg_core_1.uuid)('loan_id')
        .references(() => exports.salaryAdvance.id)
        .notNull(),
    action: (0, pg_core_1.text)('action').notNull(),
    reason: (0, pg_core_1.text)('reason'),
    action_by: (0, pg_core_1.uuid)('action_by').references(() => users_schema_1.users.id),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_loan_history').on(table.company_id),
    (0, pg_core_1.index)('idx_loan_id_loan_history').on(table.salaryAdvance_id),
    (0, pg_core_1.index)('idx_action_loan_history').on(table.action),
    (0, pg_core_1.index)('idx_created_at_loan_history').on(table.created_at),
]);
//# sourceMappingURL=loans.schema.js.map