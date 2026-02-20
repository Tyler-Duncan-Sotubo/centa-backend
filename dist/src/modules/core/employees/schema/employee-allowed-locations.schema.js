"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeAllowedLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
const schema_1 = require("../../schema");
exports.employeeAllowedLocations = (0, pg_core_1.pgTable)('employee_allowed_locations', {
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    locationId: (0, pg_core_1.uuid)('location_id')
        .notNull()
        .references(() => schema_1.companyLocations.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.employeeId, t.locationId] }),
    (0, pg_core_1.index)('employee_allowed_locations_employee_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_allowed_locations_location_idx').on(t.locationId),
]);
//# sourceMappingURL=employee-allowed-locations.schema.js.map