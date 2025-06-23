// src/modules/audit/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id'),
    action: text('action').notNull(),
    details: text('details'),
    changes: jsonb('changes'),
    ipAddress: varchar('ip_address', { length: 45 }),
    correlationId: uuid('correlation_id'),
  },
  (t) => [
    index('audit_logs_user_id_idx').on(t.userId),
    index('audit_logs_entity_idx').on(t.entity, t.entityId),
    index('audit_logs_timestamp_idx').on(t.timestamp),
  ],
);
