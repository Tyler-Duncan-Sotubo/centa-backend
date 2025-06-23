import {
  pgTable,
  uuid,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { employees } from 'src/drizzle/schema';

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    clockIn: timestamp('clock_in').notNull(),
    clockOut: timestamp('clock_out'), // null until employee clocks out

    workDurationMinutes: integer('work_duration_minutes'), // calculated on clock-out
    overtimeMinutes: integer('overtime_minutes').default(0), // if any overtime detected

    isLateArrival: boolean('is_late_arrival').default(false),
    isEarlyDeparture: boolean('is_early_departure').default(false),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('attendance_records_company_id_idx').on(t.companyId),
    index('attendance_records_employee_id_idx').on(t.employeeId),
    index('attendance_records_clock_in_idx').on(t.clockIn),
    index('attendance_records_clock_out_idx').on(t.clockOut),
    index('attendance_records_created_at_idx').on(t.createdAt),
  ],
);
