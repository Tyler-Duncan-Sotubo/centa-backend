import {
  date,
  decimal,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees, users } from 'src/drizzle/schema';

export const payrollBonuses = pgTable(
  'payroll_bonuses',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    bonusType: text('bonus_type').notNull(), // 'Performance Bonus', '13th Month', etc.
    effectiveDate: date('effective_date').notNull(),

    status: text('status').default('active'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('payroll_bonuses_company_id_idx').on(t.companyId),
    index('payroll_bonuses_employee_id_idx').on(t.employeeId),
    index('payroll_bonuses_created_by_idx').on(t.createdBy),
    index('payroll_bonuses_effective_date_idx').on(t.effectiveDate),
    index('payroll_bonuses_status_idx').on(t.status),
    index('payroll_bonuses_created_at_idx').on(t.createdAt),
  ],
);
