"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
exports.companyLocations = (0, pg_core_1.pgTable)('company_locations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' })
        .notNull(),
    isPrimary: (0, pg_core_1.boolean)('is_primary').default(false),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    street: (0, pg_core_1.varchar)('street', { length: 255 }),
    city: (0, pg_core_1.varchar)('city', { length: 100 }),
    state: (0, pg_core_1.varchar)('state', { length: 100 }),
    country: (0, pg_core_1.varchar)('country', { length: 100 }),
    postalCode: (0, pg_core_1.varchar)('postal_code', { length: 20 }),
    timeZone: (0, pg_core_1.varchar)('time_zone', { length: 50 }),
    locale: (0, pg_core_1.varchar)('locale', { length: 10 }).notNull().default('en-US'),
    latitude: (0, pg_core_1.doublePrecision)('latitude'),
    longitude: (0, pg_core_1.doublePrecision)('longitude'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_company_locations_companyId').on(t.companyId)]);
//# sourceMappingURL=company-location.schema.js.map