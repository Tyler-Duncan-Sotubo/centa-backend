import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const pipeline_templates = pgTable('pipeline_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  isGlobal: boolean('is_global').default(false),
  companyId: uuid('company_id').references(() => companies.id, {
    onDelete: 'cascade',
  }),

  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pipeline_template_stages = pgTable(
  'pipeline_template_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .references(() => pipeline_templates.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_tplstg_template').on(t.templateId),
    index('idx_tplstg_template_order').on(t.templateId, t.order),
  ],
);
