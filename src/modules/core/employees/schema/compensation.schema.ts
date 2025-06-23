import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  bigint,
  boolean,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';

export const employeeCompensations = pgTable(
  'employee_compensations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    effectiveDate: text('effective_date').notNull(),
    grossSalary: bigint('gross_salary', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
    payFrequency: varchar('pay_frequency', { length: 20 })
      .notNull()
      .default('Monthly'),

    applyNHf: boolean('apply_nhf').notNull().default(false),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('employee_compensations_employee_id_idx').on(t.employeeId),
    index('employee_compensations_effective_date_idx').on(t.effectiveDate),
    index('employee_compensations_created_at_idx').on(t.createdAt),
  ],
);
