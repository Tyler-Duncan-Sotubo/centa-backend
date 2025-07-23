import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from 'src/drizzle/schema';

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentType: varchar('parent_type', { length: 50 }).notNull(),
    parentId: uuid('parent_id').notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    name: varchar('name', { length: 255 }),
    mimeType: varchar('mime_type', { length: 100 }),
    uploadedBy: uuid('uploaded_by').references(() => employees.id),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_att_parent').on(t.parentType, t.parentId),
    index('idx_att_upload').on(t.uploadedBy),
  ],
);
