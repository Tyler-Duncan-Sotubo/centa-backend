import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { companyFileFolders } from './company-file-folders.schema';
import { companyLocations } from 'src/drizzle/schema';

export const companyFileFolderOffices = pgTable('company_file_folder_offices', {
  id: uuid('id').defaultRandom().primaryKey(),

  folderId: uuid('folder_id')
    .notNull()
    .references(() => companyFileFolders.id, { onDelete: 'cascade' }),

  officeId: uuid('office_id')
    .notNull()
    .references(() => companyLocations.id, { onDelete: 'cascade' }),
});
