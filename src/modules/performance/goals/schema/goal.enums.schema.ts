import { pgEnum } from 'drizzle-orm/pg-core';

export const objectiveStatusEnum = pgEnum('objective_status', [
  'draft',
  'active',
  'paused',
  'closed',
]);

export const visibilityEnum = pgEnum('visibility', [
  'private', // only employee + their mgr chain
  'manager', // employee + managers & HR
  'company', // entire company
]);

export const krTypeEnum = pgEnum('kr_type', [
  'metric', // has numeric target/baseline
  'milestone', // done/not done or % completion
  'binary', // simple boolean
]);

export const directionEnum = pgEnum('direction', [
  'at_least', // >= target
  'at_most', // <= target
  'increase_to', // baseline -> target (up)
  'decrease_to', // baseline -> target (down)
  'range', // within [min,max]
]);

export const sourceEnum = pgEnum('data_source', [
  'manual',
  'system',
  'integration',
]);

export const scoringMethodEnum = pgEnum('scoring_method', [
  'okr_classic', // 0.0–1.0
  'kpi_target', // % to target
  'milestone_bool',
  'milestone_pct',
]);

export const performanceCadenceEnum = pgEnum('performance_checkin_cadence', [
  'weekly',
  'biweekly',
  'monthly',
]);

export const performanceVisibilityEnum = pgEnum('performance_visibility', [
  'private',
  'manager',
  'company',
]);
