"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupMemberships = exports.groups = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("../schema/employee.schema");
const schema_1 = require("../../schema");
exports.groups = (0, pg_core_1.pgTable)('employee_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
});
exports.groupMemberships = (0, pg_core_1.pgTable)('employee_group_memberships', {
    groupId: (0, pg_core_1.uuid)('group_id')
        .notNull()
        .references(() => exports.groups.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_employee_group_memberships').on(t.employeeId)]);
//# sourceMappingURL=group.schema.js.map