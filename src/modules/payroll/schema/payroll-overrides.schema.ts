import { pgTable, uuid, date, text, boolean, index } from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';

export const payrollOverrides = pgTable(
  'payroll_overrides',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    payrollDate: date('payroll_date').notNull(),

    // Optional flag to bypass status checks (e.g. leaver, inactive)
    forceInclude: boolean('force_include').default(false),

    notes: text('notes'),
    createdAt: date('created_at').defaultNow(),
  },
  (t) => [
    index('payroll_overrides_employee_id_idx').on(t.employeeId),
    index('payroll_overrides_company_id_idx').on(t.companyId),
    index('payroll_overrides_payroll_date_idx').on(t.payrollDate),
    index('payroll_overrides_force_include_idx').on(t.forceInclude),
    index('payroll_overrides_created_at_idx').on(t.createdAt),
  ],
);
