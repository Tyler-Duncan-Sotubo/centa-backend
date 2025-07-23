import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { AppStatus } from '../../schema';
import { applications } from './applications.schema';

export const application_history = pgTable(
  'application_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    fromStatus: AppStatus('from_status'),
    toStatus: AppStatus('to_status'),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
    changedBy: uuid('changed_by').references(() => users.id),
    notes: text('notes'),
  },
  (t) => [index('idx_apphist_app').on(t.applicationId)],
);
