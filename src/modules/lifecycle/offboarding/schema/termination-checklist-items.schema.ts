import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const termination_checklist_items = pgTable(
  'termination_checklist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    order: integer('order').default(0),
    isAssetReturnStep: boolean('is_asset_return_step').default(false),
    isGlobal: boolean('is_global').default(false),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('termination_checklist_company_id_idx').on(t.companyId),
    index('termination_checklist_is_global_idx').on(t.isGlobal),
    index('termination_checklist_name_idx').on(t.name),
  ],
);
