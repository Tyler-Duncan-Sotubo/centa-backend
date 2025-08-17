import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  integer,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies, groups } from 'src/drizzle/schema'; // companies table
import { keyResults } from './performance-key-results.schema';
import { objectives } from './performance-objectives.schema';
import {
  performanceVisibilityEnum,
  performanceCadenceEnum,
} from './goal.enums.schema';

/** ----------------------------------------------------------------
 *  performance_okr_company_policies  (company-level defaults)
 *  ---------------------------------------------------------------- */
export const performanceOkrCompanyPolicies = pgTable(
  'performance_okr_company_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Defaults applied at create-time if no team override
    defaultVisibility: performanceVisibilityEnum('default_visibility')
      .notNull()
      .default('company'),
    defaultCadence: performanceCadenceEnum('default_cadence')
      .notNull()
      .default('monthly'),

    // Optional company-wide anchors for reminders
    defaultTimezone: varchar('default_timezone', { length: 64 }), // e.g. "Europe/London"
    defaultAnchorDow: integer('default_anchor_dow'), // 1..7 (Mon..Sun)
    defaultAnchorHour: integer('default_anchor_hour'), // 0..23

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_performance_okr_company_policies_company').on(t.companyId),
    uniqueIndex('uniq_performance_okr_company_policy_per_company').on(
      t.companyId,
    ),
  ],
);

/** ----------------------------------------------------------------
 *  performance_okr_team_policies  (team-level overrides)
 *  ---------------------------------------------------------------- */
export const performanceOkrTeamPolicies = pgTable(
  'performance_okr_team_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),

    visibility: performanceVisibilityEnum('visibility'),
    cadence: performanceCadenceEnum('cadence'),
    defaultOwnerIsLead: boolean('default_owner_is_lead').default(true),

    // Optional team-specific anchors (fall back to company if null)
    timezone: varchar('timezone', { length: 64 }),
    anchorDow: integer('anchor_dow'),
    anchorHour: integer('anchor_hour'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_performance_okr_team_policies_company_group').on(
      t.companyId,
      t.groupId,
    ),
    uniqueIndex('uniq_performance_okr_team_policy_per_group').on(
      t.companyId,
      t.groupId,
    ),
  ],
);

/** ----------------------------------------------------------------
 *  performance_checkin_schedules  (live per-Objective/KR schedules)
 *  ---------------------------------------------------------------- */
export const performanceCheckinSchedules = pgTable(
  'performance_checkin_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Exactly one of these must be set (see migration CHECK below)
    objectiveId: uuid('objective_id').references(() => objectives.id, {
      onDelete: 'cascade',
    }),
    keyResultId: uuid('key_result_id').references(() => keyResults.id, {
      onDelete: 'cascade',
    }),

    frequency: performanceCadenceEnum('frequency').notNull(), // weekly|biweekly|monthly
    nextDueAt: timestamp('next_due_at').notNull(),

    // Materialized from policy at create-time for stable reminders
    timezone: varchar('timezone', { length: 64 }),
    anchorDow: integer('anchor_dow'), // 1..7 Mon..Sun
    anchorHour: integer('anchor_hour'), // 0..23

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    // Fast worker scans
    index('idx_performance_checkins_due').on(t.nextDueAt),
    index('idx_performance_checkins_objective').on(t.objectiveId),
    index('idx_performance_checkins_kr').on(t.keyResultId),

    // At most ONE schedule per objective and per KR (partial unique indexes)
    uniqueIndex('uniq_performance_checkin_per_objective')
      .on(t.objectiveId)
      .where(sql`${t.objectiveId} IS NOT NULL`),

    uniqueIndex('uniq_performance_checkin_per_kr')
      .on(t.keyResultId)
      .where(sql`${t.keyResultId} IS NOT NULL`),
  ],
);
