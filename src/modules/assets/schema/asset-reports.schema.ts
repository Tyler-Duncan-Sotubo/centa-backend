import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';
import { assets } from './assets.schema';

export const assetReports = pgTable(
  'asset_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),

    reportType: text('report_type').notNull(), // lost, damaged, replacement, other
    description: text('description').notNull(),
    documentUrl: text('document_url'), // optional image/document
    status: text('status').default('open'), // open, in-progress, resolved, rejected
    reportedAt: timestamp('reported_at').defaultNow(),
    resolvedAt: timestamp('resolved_at'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('asset_reports_employee_id_idx').on(t.employeeId),
    index('asset_reports_company_id_idx').on(t.companyId),
    index('asset_reports_asset_id_idx').on(t.assetId),
    index('asset_reports_report_type_idx').on(t.reportType),
    index('asset_reports_status_idx').on(t.status),
    index('asset_reports_reported_at_idx').on(t.reportedAt),
  ],
);
