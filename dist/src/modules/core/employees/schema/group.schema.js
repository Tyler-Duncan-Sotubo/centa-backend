"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupMemberships = exports.groups = exports.memberRoleEnum = exports.groupTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("../schema/employee.schema");
const schema_1 = require("../../schema");
exports.groupTypeEnum = (0, pg_core_1.pgEnum)('group_type', [
    'TEAM',
    'PROJECT',
    'INTEREST',
    'SECURITY',
]);
exports.memberRoleEnum = (0, pg_core_1.pgEnum)('group_member_role', [
    'member',
    'lead',
    'manager',
    'contractor',
]);
exports.groups = (0, pg_core_1.pgTable)('employee_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 120 }),
    type: (0, exports.groupTypeEnum)('type').notNull().default('TEAM'),
    parentGroupId: (0, pg_core_1.uuid)('parent_group_id').references(() => exports.groups.id, {
        onDelete: 'set null',
    }),
    location: (0, pg_core_1.varchar)('location', { length: 100 }),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 64 }),
    headcountCap: (0, pg_core_1.integer)('headcount_cap'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_groups_company_type').on(t.companyId, t.type),
    (0, pg_core_1.index)('idx_groups_parent').on(t.parentGroupId),
    (0, pg_core_1.uniqueIndex)('uniq_groups_company_name').on(t.companyId, t.name),
    (0, pg_core_1.uniqueIndex)('uniq_groups_company_slug').on(t.companyId, t.slug),
]);
exports.groupMemberships = (0, pg_core_1.pgTable)('employee_group_memberships', {
    groupId: (0, pg_core_1.uuid)('group_id')
        .notNull()
        .references(() => exports.groups.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    role: (0, exports.memberRoleEnum)('role').notNull().default('member'),
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    title: (0, pg_core_1.varchar)('title', { length: 120 }),
    startDate: (0, pg_core_1.date)('start_date'),
    endDate: (0, pg_core_1.date)('end_date'),
    allocationPct: (0, pg_core_1.integer)('allocation_pct'),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('pk_group_membership_composite').on(t.groupId, t.employeeId),
    (0, pg_core_1.index)('idx_group_memberships_group').on(t.groupId),
    (0, pg_core_1.index)('idx_group_memberships_employee').on(t.employeeId),
    (0, pg_core_1.index)('idx_group_memberships_primary').on(t.employeeId, t.isPrimary),
]);
//# sourceMappingURL=group.schema.js.map