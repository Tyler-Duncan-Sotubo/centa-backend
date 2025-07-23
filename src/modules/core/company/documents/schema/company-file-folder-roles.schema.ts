import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { companyFileFolders } from './company-file-folders.schema';
import { companyRoles } from 'src/drizzle/schema';

export const companyFileFolderRoles = pgTable('company_file_folder_roles', {
  id: uuid('id').defaultRandom().primaryKey(),

  folderId: uuid('folder_id')
    .notNull()
    .references(() => companyFileFolders.id, { onDelete: 'cascade' }),

  roleId: uuid('role_id')
    .notNull()
    .references(() => companyRoles.id, { onDelete: 'cascade' }),
});
