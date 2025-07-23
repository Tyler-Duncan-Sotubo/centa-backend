// src/drizzle/schema/company_file_folders.ts

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { companies } from '../../schema/company.schema';
import { users } from 'src/drizzle/schema';

export const companyFileFolders = pgTable('company_file_folders', {
  id: uuid('id').defaultRandom().primaryKey(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 255 }).notNull(),

  permissionControlled: boolean('permission_controlled').default(false),

  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),

  isSystem: boolean('is_system').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow(),
});
