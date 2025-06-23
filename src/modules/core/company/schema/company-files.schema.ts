// src/drizzle/schema/company_files.ts

import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

export const companyFiles = pgTable('company_files', {
  id: uuid('id').defaultRandom().primaryKey(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 255 }).notNull(), // Stored file name (e.g., payrolls_123_202504.csv)
  url: text('url').notNull(), // Full S3 URL
  type: varchar('type', { length: 100 }).notNull(), // payroll, attendance_report, employees_upload, etc
  category: varchar('category', { length: 100 }).notNull(), // uploads, reports, etc

  createdAt: timestamp('created_at').defaultNow(),
});
