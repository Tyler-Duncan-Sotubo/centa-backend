"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceAdjustments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const attendance_records_schema_1 = require("./attendance-records.schema");
exports.attendanceAdjustments = (0, pg_core_1.pgTable)('attendance_adjustments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    attendanceRecordId: (0, pg_core_1.uuid)('attendance_record_id')
        .notNull()
        .references(() => attendance_records_schema_1.attendanceRecords.id, { onDelete: 'cascade' }),
    adjustedClockIn: (0, pg_core_1.timestamp)('adjusted_clock_in'),
    adjustedClockOut: (0, pg_core_1.timestamp)('adjusted_clock_out'),
    reason: (0, pg_core_1.text)('reason'),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('attendance_adjustments_record_id_idx').on(t.attendanceRecordId),
    (0, pg_core_1.index)('attendance_adjustments_approved_by_idx').on(t.approvedBy),
    (0, pg_core_1.index)('attendance_adjustments_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=attendance-adjustments.schema.js.map