"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRecords = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const schema_2 = require("../../../drizzle/schema");
exports.attendanceRecords = (0, pg_core_1.pgTable)('attendance_records', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_2.employees.id, { onDelete: 'cascade' }),
    clockIn: (0, pg_core_1.timestamp)('clock_in').notNull(),
    clockOut: (0, pg_core_1.timestamp)('clock_out'),
    workDurationMinutes: (0, pg_core_1.integer)('work_duration_minutes'),
    overtimeMinutes: (0, pg_core_1.integer)('overtime_minutes').default(0),
    isLateArrival: (0, pg_core_1.boolean)('is_late_arrival').default(false),
    isEarlyDeparture: (0, pg_core_1.boolean)('is_early_departure').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('attendance_records_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('attendance_records_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('attendance_records_clock_in_idx').on(t.clockIn),
    (0, pg_core_1.index)('attendance_records_clock_out_idx').on(t.clockOut),
    (0, pg_core_1.index)('attendance_records_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=attendance-records.schema.js.map