// feedbackRuleScopes.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const feedbackRuleScopes = pgTable('performance_feedback_rule_scopes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').notNull(), // FK to feedbackRules.id
  type: text('type').$type<'office' | 'department'>().notNull(),
  referenceId: uuid('reference_id').notNull(), // ID of office or department
  createdAt: timestamp('created_at').defaultNow(),
});
