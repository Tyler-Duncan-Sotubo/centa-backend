import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  date,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from 'src/drizzle/schema';
import { objectives } from './performance-objectives.schema';
import {
  krTypeEnum,
  scoringMethodEnum,
  directionEnum,
  sourceEnum,
} from './goal.enums.schema';

export const keyResults = pgTable(
  'performance_key_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objectiveId: uuid('objective_id')
      .notNull()
      .references(() => objectives.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    description: text('description'),

    type: krTypeEnum('type').notNull().default('metric'),
    scoringMethod: scoringMethodEnum('scoring_method')
      .notNull()
      .default('okr_classic'),

    // Metric configuration
    unit: text('unit'), // "%", "ms", "USD", etc.
    direction: directionEnum('direction'), // e.g., "decrease_to"
    baseline: numeric('baseline', { precision: 18, scale: 6 }),
    target: numeric('target', { precision: 18, scale: 6 }),
    minRange: numeric('min_range', { precision: 18, scale: 6 }), // for "range"
    maxRange: numeric('max_range', { precision: 18, scale: 6 }),

    // Current cached value & progress (0..100), optional cache for fast reads
    current: numeric('current', { precision: 18, scale: 6 }),
    progressPct: integer('progress_pct'), // 0..100

    weight: integer('weight'), // 0..100 relative to objective
    ownerEmployeeId: uuid('owner_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),

    // Data ingest
    source: sourceEnum('source').notNull().default('manual'),
    sourceRef: text('source_ref'), // connector/metric id, query key, etc.

    startDate: date('start_date'),
    dueDate: date('due_date'),
    isArchived: boolean('is_archived').default(false),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_krs_objective').on(t.objectiveId),
    index('idx_krs_owner').on(t.ownerEmployeeId),
  ],
);
