"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRolePermissions = exports.companyRoles = exports.permissions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.permissions = (0, pg_core_1.pgTable)('permissions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    key: (0, pg_core_1.varchar)('key', { length: 100 }).unique().notNull(),
}, (table) => [(0, pg_core_1.index)('permissions_key_unique').on(table.key)]);
exports.companyRoles = (0, pg_core_1.pgTable)('company_roles', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_permission').on(table.companyId),
    (0, pg_core_1.uniqueIndex)('company_role_unique').on(table.companyId, table.name),
]);
exports.companyRolePermissions = (0, pg_core_1.pgTable)('company_role_permissions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyRoleId: (0, pg_core_1.uuid)('company_role_id')
        .notNull()
        .references(() => exports.companyRoles.id, { onDelete: 'cascade' }),
    permissionId: (0, pg_core_1.uuid)('permission_id')
        .notNull()
        .references(() => exports.permissions.id, { onDelete: 'cascade' }),
}, (table) => [
    (0, pg_core_1.index)('idx_company_role_permissions').on(table.companyRoleId),
    (0, pg_core_1.index)('idx_permission_id').on(table.permissionId),
    (0, pg_core_1.uniqueIndex)('company_role_permission_unique').on(table.companyRoleId, table.permissionId),
]);
//# sourceMappingURL=permissions.schema.js.map