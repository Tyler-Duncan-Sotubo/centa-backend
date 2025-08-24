import { pgEnum } from 'drizzle-orm/pg-core';

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
