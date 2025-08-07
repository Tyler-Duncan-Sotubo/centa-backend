import {
  boolean,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const termination_reasons = pgTable(
  'termination_reasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isGlobal: boolean('is_global').default(false),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),
  },
  (t) => [
    index('termination_reasons_company_id_idx').on(t.companyId),
    index('termination_reasons_is_global_idx').on(t.isGlobal),
    index('termination_reasons_name_idx').on(t.name),
  ],
);
