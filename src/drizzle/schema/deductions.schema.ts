import {
  uuid,
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';
import { employees } from './employee.schema';

export const taxConfig = pgTable('tax-config', {
  id: uuid('id').defaultRandom().primaryKey(),
  apply_paye: boolean('apply_paye').default(false),
  apply_nhf: boolean('apply_nhf').default(false),
  apply_pension: boolean('apply_pension').default(false),

  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
});

export const customDeductions = pgTable('custom_deductions', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  deduction_name: text('deduction_name').notNull(),

  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),

  amount: integer('amount').notNull(),
  deduction_date: timestamp('deduction_date').defaultNow(),
});
