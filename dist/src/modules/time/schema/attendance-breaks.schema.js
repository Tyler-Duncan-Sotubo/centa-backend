"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceBreaks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const attendance_records_schema_1 = require("./attendance-records.schema");
exports.attendanceBreaks = (0, pg_core_1.pgTable)('attendance_breaks', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    attendanceRecordId: (0, pg_core_1.uuid)('attendance_record_id')
        .notNull()
        .references(() => attendance_records_schema_1.attendanceRecords.id, { onDelete: 'cascade' }),
    breakStart: (0, pg_core_1.timestamp)('break_start', { withTimezone: true }).notNull(),
    breakEnd: (0, pg_core_1.timestamp)('break_end', { withTimezone: true }),
    durationMinutes: (0, pg_core_1.integer)('duration_minutes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => ({
    byCompany: (0, pg_core_1.index)('attendance_breaks_company_idx').on(t.companyId),
    byAttendance: (0, pg_core_1.index)('attendance_breaks_attendance_idx').on(t.attendanceRecordId),
    byAttendanceStart: (0, pg_core_1.index)('attendance_breaks_attendance_start_idx').on(t.attendanceRecordId, t.breakStart),
}));
//# sourceMappingURL=attendance-breaks.schema.js.map