"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shifts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.shifts = (0, pg_core_1.pgTable)('shifts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    locationId: (0, pg_core_1.uuid)('company_location').references(() => schema_1.companyLocations.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    startTime: (0, pg_core_1.time)('start_time').notNull(),
    endTime: (0, pg_core_1.time)('end_time').notNull(),
    workingDays: (0, pg_core_1.jsonb)('working_days').notNull(),
    lateToleranceMinutes: (0, pg_core_1.integer)('late_tolerance_minutes').default(10),
    allowEarlyClockIn: (0, pg_core_1.boolean)('allow_early_clock_in').default(false),
    earlyClockInMinutes: (0, pg_core_1.integer)('early_clock_in_minutes').default(0),
    allowLateClockOut: (0, pg_core_1.boolean)('allow_late_clock_out').default(false),
    lateClockOutMinutes: (0, pg_core_1.integer)('late_clock_out_minutes').default(0),
    notes: (0, pg_core_1.varchar)('notes', { length: 255 }),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('shifts_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('shifts_location_id_idx').on(t.locationId),
    (0, pg_core_1.index)('shifts_name_idx').on(t.name),
    (0, pg_core_1.index)('shifts_is_deleted_idx').on(t.isDeleted),
    (0, pg_core_1.index)('shifts_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=shifts.schema.js.map