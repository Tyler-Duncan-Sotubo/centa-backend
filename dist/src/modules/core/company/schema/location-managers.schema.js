"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationManagers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
const company_location_schema_1 = require("./company-location.schema");
exports.locationManagers = (0, pg_core_1.pgTable)('location_managers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    locationId: (0, pg_core_1.uuid)('location_id')
        .references(() => company_location_schema_1.companyLocations.id, { onDelete: 'cascade' })
        .notNull(),
    managerId: (0, pg_core_1.uuid)('manager_id')
        .references(() => schema_1.employees.id, { onDelete: 'cascade' })
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
//# sourceMappingURL=location-managers.schema.js.map