import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { companyFileFolders } from './company-file-folders.schema';
import { departments } from 'src/drizzle/schema';

export const companyFileFolderDepartments = pgTable(
  'company_file_folder_departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    folderId: uuid('folder_id')
      .notNull()
      .references(() => companyFileFolders.id, { onDelete: 'cascade' }),

    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
  },
);
