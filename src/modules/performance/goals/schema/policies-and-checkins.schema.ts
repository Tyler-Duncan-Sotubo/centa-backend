import {
  pgTable,
  uuid,
  timestamp,
  integer,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { performanceGoals } from 'src/modules/performance/goals/schema/performance-goals.schema';
import {
  performanceVisibilityEnum,
  performanceCadenceEnum,
} from './goal.enums.schema';

/** ---------------------------------------------------------------
 *  performance_goal_company_policies (company-level defaults)
 *  -------------------------------------------------------------- */
export const performanceGoalCompanyPolicies = pgTable(
  'performance_goal_company_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Defaults applied at goal create-time
    defaultVisibility: performanceVisibilityEnum('default_visibility')
      .notNull()
      .default('company'),
    defaultCadence: performanceCadenceEnum('default_cadence')
      .notNull()
      .default('monthly'),

    // Optional anchors for reminders
    defaultTimezone: varchar('default_timezone', { length: 64 }), // e.g. "Europe/London"
    defaultAnchorDow: integer('default_anchor_dow'), // 1..7 (Mon..Sun)
    defaultAnchorHour: integer('default_anchor_hour'), // 0..23

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_goal_company_policies_company').on(t.companyId),
    uniqueIndex('uniq_goal_company_policy_per_company').on(t.companyId),
  ],
);

/** ---------------------------------------------------------------
 *  performance_goal_checkin_schedules (per-goal schedules)
 *  -------------------------------------------------------------- */
export const performanceGoalCheckinSchedules = pgTable(
  'performance_goal_checkin_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    goalId: uuid('goal_id')
      .notNull()
      .references(() => performanceGoals.id, { onDelete: 'cascade' }),

    frequency: performanceCadenceEnum('frequency').notNull(), // weekly|biweekly|monthly
    nextDueAt: timestamp('next_due_at', { withTimezone: true }).notNull(),

    // Materialized from policy at create-time for stable reminders
    timezone: varchar('timezone', { length: 64 }),
    anchorDow: integer('anchor_dow'), // 1..7 Mon..Sun
    anchorHour: integer('anchor_hour'), // 0..23

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_goal_checkins_due').on(t.nextDueAt),
    index('idx_goal_checkins_goal').on(t.goalId),
    uniqueIndex('uniq_goal_checkin_per_goal').on(t.goalId),
  ],
);
