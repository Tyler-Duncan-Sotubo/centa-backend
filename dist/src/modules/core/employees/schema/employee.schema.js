"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employees = exports.employeeStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const company_schema_1 = require("../../company/schema/company.schema");
const pay_groups_schema_1 = require("../../../payroll/schema/pay-groups.schema");
exports.employeeStatus = (0, pg_core_1.pgEnum)('employee_status', [
    'probation',
    'active',
    'on_leave',
    'resigned',
    'terminated',
    'onboarding',
]);
exports.employees = (0, pg_core_1.pgTable)('employees', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeNumber: (0, pg_core_1.varchar)('employee_number', { length: 50 }).notNull(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    departmentId: (0, pg_core_1.uuid)('department_id').references(() => schema_1.departments.id, {
        onDelete: 'set null',
    }),
    jobRoleId: (0, pg_core_1.uuid)('job_role_id').references(() => schema_1.jobRoles.id, {
        onDelete: 'set null',
    }),
    managerId: (0, pg_core_1.uuid)('manager_id').references(() => exports.employees.id, {
        onDelete: 'set null',
    }),
    costCenterId: (0, pg_core_1.uuid)('cost_center_id').references(() => schema_1.costCenters.id, {
        onDelete: 'set null',
    }),
    locationId: (0, pg_core_1.uuid)('company_location').references(() => schema_1.companyLocations.id, {
        onDelete: 'set null',
    }),
    payGroupId: (0, pg_core_1.uuid)('pay_group_id').references(() => pay_groups_schema_1.payGroups.id, {
        onDelete: 'set null',
    }),
    employmentStatus: (0, exports.employeeStatus)('employment_status')
        .default('active')
        .notNull(),
    employmentStartDate: (0, pg_core_1.text)('employment_start_date').notNull(),
    employmentEndDate: (0, pg_core_1.timestamp)('employment_end_date'),
    confirmed: (0, pg_core_1.boolean)('confirmed').default(true),
    probationEndDate: (0, pg_core_1.text)('probation_end_date'),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
}, (t) => [
    (0, pg_core_1.index)('employees_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('employees_user_id_idx').on(t.userId),
    (0, pg_core_1.index)('employees_department_id_idx').on(t.departmentId),
    (0, pg_core_1.index)('employees_job_role_id_idx').on(t.jobRoleId),
    (0, pg_core_1.index)('employees_manager_id_idx').on(t.managerId),
    (0, pg_core_1.index)('employees_cost_center_id_idx').on(t.costCenterId),
    (0, pg_core_1.index)('employees_location_id_idx').on(t.locationId),
    (0, pg_core_1.index)('employees_pay_group_id_idx').on(t.payGroupId),
    (0, pg_core_1.index)('employees_employment_status_idx').on(t.employmentStatus),
    (0, pg_core_1.index)('employees_employment_start_date_idx').on(t.employmentStartDate),
    (0, pg_core_1.index)('employees_probation_end_date_idx').on(t.probationEndDate),
    (0, pg_core_1.index)('employees_first_name_idx').on(t.firstName),
    (0, pg_core_1.index)('employees_last_name_idx').on(t.lastName),
    (0, pg_core_1.index)('employees_created_at_idx').on(t.createdAt),
    (0, pg_core_1.index)('employees_updated_at_idx').on(t.updatedAt),
]);
//# sourceMappingURL=employee.schema.js.map