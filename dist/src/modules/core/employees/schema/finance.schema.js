"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeFinancials = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.employeeFinancials = (0, pg_core_1.pgTable)('employee_financials', {
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .primaryKey()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    bankName: (0, pg_core_1.varchar)('bank_name', { length: 200 }),
    bankAccountNumber: (0, pg_core_1.varchar)('bank_account_number', { length: 200 }),
    bankAccountName: (0, pg_core_1.varchar)('bank_account_name', { length: 200 }),
    bankBranch: (0, pg_core_1.varchar)('bank_branch', { length: 200 }),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).default('NGN'),
    tin: (0, pg_core_1.varchar)('tin', { length: 200 }),
    pensionPin: (0, pg_core_1.varchar)('pension_pin', { length: 200 }),
    nhfNumber: (0, pg_core_1.varchar)('nhf_number', { length: 200 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_financials_bank_name_idx').on(t.bankName),
    (0, pg_core_1.index)('employee_financials_currency_idx').on(t.currency),
    (0, pg_core_1.index)('employee_financials_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=finance.schema.js.map