import { pgTable, uuid, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { attendanceRecords } from './attendance-records.schema';

export const attendanceBreaks = pgTable(
  'attendance_breaks',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    attendanceRecordId: uuid('attendance_record_id')
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: 'cascade' }),

    breakStart: timestamp('break_start', { withTimezone: true }).notNull(),
    breakEnd: timestamp('break_end', { withTimezone: true }),

    durationMinutes: integer('duration_minutes'), // set when break ends

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byCompany: index('attendance_breaks_company_idx').on(t.companyId),
    byAttendance: index('attendance_breaks_attendance_idx').on(
      t.attendanceRecordId,
    ),
    byAttendanceStart: index('attendance_breaks_attendance_start_idx').on(
      t.attendanceRecordId,
      t.breakStart,
    ),
  }),
);
