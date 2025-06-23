"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paySchedules = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.paySchedules = (0, pg_core_1.pgTable)('pay_schedules', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    payFrequency: (0, pg_core_1.text)('pay_frequency').notNull().default('monthly'),
    paySchedule: (0, pg_core_1.jsonb)('pay_schedule'),
    weekendAdjustment: (0, pg_core_1.text)('weekend_adjustment').notNull().default('none'),
    holidayAdjustment: (0, pg_core_1.text)('holiday_adjustment').notNull().default('none'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
}, (t) => [
    (0, pg_core_1.index)('pay_schedules_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('pay_schedules_start_date_idx').on(t.startDate),
    (0, pg_core_1.index)('pay_schedules_pay_frequency_idx').on(t.payFrequency),
    (0, pg_core_1.index)('pay_schedules_is_deleted_idx').on(t.isDeleted),
    (0, pg_core_1.index)('pay_schedules_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=pay-schedules.schema.js.map