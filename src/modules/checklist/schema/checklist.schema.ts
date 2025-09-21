import {
  pgTable,
  varchar,
  timestamp,
  index,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const checklistCompletion = pgTable(
  'checklist_completion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: varchar('company_id').notNull(),
    checklistKey: varchar('checklist_key').notNull(),
    completedBy: varchar('completed_by').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('checklist_completion_company_id_idx').on(t.companyId),
    index('checklist_completion_checklist_key_idx').on(t.checklistKey),
    uniqueIndex('checklist_completion_company_key_unq').on(
      t.companyId,
      t.checklistKey,
    ), // <-- required
  ],
);
