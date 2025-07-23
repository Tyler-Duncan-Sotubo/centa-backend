// src/drizzle/schema/company_files.ts

import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { companies } from '../../schema/company.schema';
import { users } from 'src/drizzle/schema';
import { companyFileFolders } from './company-file-folders.schema';

export const companyFiles = pgTable('company_files', {
  id: uuid('id').defaultRandom().primaryKey(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  folderId: uuid('folder_id').references(() => companyFileFolders.id, {
    onDelete: 'set null',
  }),

  name: varchar('name', { length: 255 }).notNull(), // Stored name, e.g., timesheet_june.pdf
  url: text('url').notNull(), // Full S3 URL or CloudFront URL

  type: varchar('type', { length: 100 }).notNull(), // e.g., 'payroll', 'document', 'report'
  category: varchar('category', { length: 100 }).notNull(), // e.g., 'uploads', 'contracts'

  uploadedBy: uuid('uploaded_by').references(() => users.id, {
    onDelete: 'set null',
  }),

  createdAt: timestamp('created_at').defaultNow(),
});
