import {
  boolean,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const termination_types = pgTable(
  'termination_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isGlobal: boolean('is_global').default(false),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),
  },
  (t) => [
    index('termination_types_company_id_idx').on(t.companyId),
    index('termination_types_is_global_idx').on(t.isGlobal),
    index('termination_types_name_idx').on(t.name),
  ],
);
