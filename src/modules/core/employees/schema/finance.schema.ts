// src/modules/core/employees/finance/finance.schema.ts
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';

export const employeeFinancials = pgTable(
  'employee_financials',
  {
    employeeId: uuid('employee_id')
      .notNull()
      .primaryKey()
      .references(() => employees.id, { onDelete: 'cascade' }),
    bankName: varchar('bank_name', { length: 200 }),
    bankAccountNumber: varchar('bank_account_number', { length: 200 }),
    bankAccountName: varchar('bank_account_name', { length: 200 }),
    bankBranch: varchar('bank_branch', { length: 200 }),
    currency: varchar('currency', { length: 3 }).default('NGN'),
    tin: varchar('tin', { length: 200 }),
    pensionPin: varchar('pension_pin', { length: 200 }),
    nhfNumber: varchar('nhf_number', { length: 200 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('employee_financials_bank_name_idx').on(t.bankName),
    index('employee_financials_currency_idx').on(t.currency),
    index('employee_financials_created_at_idx').on(t.createdAt),
  ],
);
