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
import { companies, employees } from 'src/drizzle/schema';
import { termination_reasons } from './termination-reasons.schema';
import { termination_types } from './termination-types.schema';
import { assets } from 'src/modules/assets/schema/assets.schema';

export const termination_sessions = pgTable(
  'termination_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    terminationType: uuid('termination_type_id').references(
      () => termination_types.id,
    ),
    terminationReason: uuid('termination_reason_id').references(
      () => termination_reasons.id,
    ),

    terminationDate: varchar('termination_date').notNull(),
    eligibleForRehire: boolean('eligible_for_rehire').default(true),

    notes: text('notes'),
    status: varchar('status', { length: 20 }).default('in_progress'),
    startedAt: timestamp('started_at').defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (t) => [
    index('termination_sessions_employee_id_idx').on(t.employeeId),
    index('termination_sessions_company_id_idx').on(t.companyId),
    index('termination_sessions_status_idx').on(t.status),
  ],
);

export const employee_termination_checklist = pgTable(
  'employee_termination_checklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => termination_sessions.id, {
        onDelete: 'cascade',
      }),

    assetId: uuid('asset_id').references(() => assets.id, {
      onDelete: 'set null',
    }),

    name: text('name').notNull(),
    description: text('description'),
    isAssetReturnStep: boolean('is_asset_return_step').default(false),
    order: integer('order').default(0),

    completed: boolean('completed').default(false),
    completedAt: timestamp('completed_at'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('employee_termination_checklist_session_id_idx').on(t.sessionId),
  ],
);
