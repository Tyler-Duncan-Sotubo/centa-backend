import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';

export const assetRequests = pgTable(
  'asset_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestDate: date('request_date').notNull(),
    assetType: text('asset_type').notNull(),
    purpose: text('purpose').notNull(),
    urgency: text('urgency').notNull(),
    notes: text('notes'),
    status: text('status').default('pending'), // pending, approved, rejected, processing, fulfilled, etc.
    createdAt: timestamp('created_at').defaultNow(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    rejectionReason: text('rejection_reason'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('asset_requests_employee_id_idx').on(t.employeeId),
    index('asset_requests_company_id_idx').on(t.companyId),
    index('asset_requests_status_idx').on(t.status),
    index('asset_requests_request_date_idx').on(t.requestDate),
    index('asset_requests_asset_type_idx').on(t.assetType),
    index('asset_requests_urgency_idx').on(t.urgency),
  ],
);
