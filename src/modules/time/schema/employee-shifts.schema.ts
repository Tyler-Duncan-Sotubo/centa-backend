import {
  pgTable,
  uuid,
  date,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { employees } from 'src/drizzle/schema';
import { shifts } from './shifts.schema';

export const employeeShifts = pgTable(
  'employee_shifts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    shiftId: uuid('shift_id').references(() => shifts.id, {
      onDelete: 'cascade',
    }),

    shiftDate: date('shift_date').notNull(),
    isDeleted: boolean('is_deleted').default(false),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('employee_shifts_company_id_idx').on(t.companyId),
    index('employee_shifts_employee_id_idx').on(t.employeeId),
    index('employee_shifts_shift_id_idx').on(t.shiftId),
    index('employee_shifts_shift_date_idx').on(t.shiftDate),
    index('employee_shifts_is_deleted_idx').on(t.isDeleted),
    index('employee_shifts_created_at_idx').on(t.createdAt),
  ],
);
