import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { attendanceRecords } from './attendance-records.schema';

export const attendanceAdjustments = pgTable(
  'attendance_adjustments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    attendanceRecordId: uuid('attendance_record_id')
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: 'cascade' }),

    adjustedClockIn: timestamp('adjusted_clock_in'),
    adjustedClockOut: timestamp('adjusted_clock_out'),

    reason: text('reason'), // why the manual edit (e.g., forgot to clock out)
    approvedBy: uuid('approved_by'), // admin/hr userId

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('attendance_adjustments_record_id_idx').on(t.attendanceRecordId),
    index('attendance_adjustments_approved_by_idx').on(t.approvedBy),
    index('attendance_adjustments_created_at_idx').on(t.createdAt),
  ],
);
