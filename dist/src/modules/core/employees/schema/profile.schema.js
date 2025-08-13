"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeProfiles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("../schema/employee.schema");
exports.employeeProfiles = (0, pg_core_1.pgTable)('employee_profiles', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    dateOfBirth: (0, pg_core_1.date)('date_of_birth'),
    gender: (0, pg_core_1.varchar)('gender', { length: 20 }),
    maritalStatus: (0, pg_core_1.varchar)('marital_status', { length: 20 }),
    address: (0, pg_core_1.text)('address'),
    state: (0, pg_core_1.varchar)('state', { length: 100 }),
    country: (0, pg_core_1.varchar)('country', { length: 100 }),
    phone: (0, pg_core_1.text)('phone'),
    emergencyName: (0, pg_core_1.varchar)('emergency_contact_name', { length: 100 }),
    emergencyPhone: (0, pg_core_1.text)('emergency_contact_phone'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
}, (t) => [
    (0, pg_core_1.index)('employee_profiles_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_profiles_date_of_birth_idx').on(t.dateOfBirth),
    (0, pg_core_1.index)('employee_profiles_gender_idx').on(t.gender),
    (0, pg_core_1.index)('employee_profiles_marital_status_idx').on(t.maritalStatus),
    (0, pg_core_1.index)('employee_profiles_state_idx').on(t.state),
    (0, pg_core_1.index)('employee_profiles_country_idx').on(t.country),
    (0, pg_core_1.index)('employee_profiles_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=profile.schema.js.map