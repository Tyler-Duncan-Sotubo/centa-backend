// feedbackRules.ts
import { pgTable, uuid, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const feedbackRules = pgTable('performance_feedback_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  group: text('group').$type<'employee' | 'manager'>().notNull(),
  type: text('type')
    .$type<'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager'>()
    .notNull(),
  enabled: boolean('enabled').notNull().default(false),
  officeOnly: boolean('office_only').default(false),
  departmentOnly: boolean('department_only').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
