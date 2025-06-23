import {
  index,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).unique().notNull(),
  },
  (table) => [index('permissions_key_unique').on(table.key)],
);

export const companyRoles = pgTable(
  'company_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => [
    index('idx_company_id_permission').on(table.companyId),
    uniqueIndex('company_role_unique').on(table.companyId, table.name),
  ],
);

export const companyRolePermissions = pgTable(
  'company_role_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyRoleId: uuid('company_role_id')
      .notNull()
      .references(() => companyRoles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_company_role_permissions').on(table.companyRoleId),
    index('idx_permission_id').on(table.permissionId),
    uniqueIndex('company_role_permission_unique').on(
      table.companyRoleId,
      table.permissionId,
    ),
  ],
);
