"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holidays = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.holidays = (0, pg_core_1.pgTable)('holidays', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    date: (0, pg_core_1.date)('date').notNull(),
    year: (0, pg_core_1.text)('year').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    country: (0, pg_core_1.varchar)('country', { length: 100 }),
    countryCode: (0, pg_core_1.varchar)('country_code', { length: 5 }),
    isWorkingDayOverride: (0, pg_core_1.boolean)('is_working_day_override').default(false),
    source: (0, pg_core_1.varchar)('source', { length: 50 }).default('manual'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('holidays_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('holidays_date_idx').on(t.date),
    (0, pg_core_1.index)('holidays_name_idx').on(t.name),
    (0, pg_core_1.index)('holidays_year_idx').on(t.year),
    (0, pg_core_1.index)('holidays_type_idx').on(t.type),
    (0, pg_core_1.index)('holidays_country_idx').on(t.country),
    (0, pg_core_1.index)('holidays_source_idx').on(t.source),
]);
//# sourceMappingURL=holidays.schema.js.map