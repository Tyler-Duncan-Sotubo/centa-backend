import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies, users } from 'src/drizzle/schema';
import { directionEnum, sourceEnum } from './goal.enums.schema';

export const kpis = pgTable(
  'kpis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    unit: text('unit').notNull(),
    direction: directionEnum('direction').notNull(), // defines success direction
    source: sourceEnum('source').notNull().default('manual'),
    sourceRef: text('source_ref'),
    isArchived: boolean('is_archived').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [index('idx_kpis_company').on(t.companyId)],
);

// time-series values (can also power KR "current")
export const kpiSnapshots = pgTable(
  'kpi_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kpiId: uuid('kpi_id')
      .notNull()
      .references(() => kpis.id, { onDelete: 'cascade' }),
    value: numeric('value', { precision: 18, scale: 6 }).notNull(),
    collectedAt: timestamp('collected_at').notNull().defaultNow(),
    collectedBy: uuid('collected_by').references(() => users.id),
    note: text('note'),
  },
  (t) => [index('idx_kpi_snapshots_kpi_time').on(t.kpiId, t.collectedAt)],
);
