import {
  pgTable,
  uuid,
  text,
  pgEnum,
  integer,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { onboardingTemplates } from './onboarding-templates.schema';

export const checklistAssigneeEnum = pgEnum('checklist_assignee', [
  'employee',
  'hr',
  'it',
  'finance',
]);

export const checklistStatusEnum = pgEnum('checklist_status', [
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'skipped',
  'cancelled',
]);

export const onboardingTemplateChecklists = pgTable(
  'onboarding_template_checklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => onboardingTemplates.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    assignee: checklistAssigneeEnum('assignee').default('employee'),
    order: integer('order').default(0),
    dueDaysAfterStart: integer('due_days_after_start').default(1),
  },
  (t) => [
    index('onboarding_template_checklists_template_id_idx').on(t.templateId),
  ],
);

export const employeeChecklistStatus = pgTable(
  'employee_checklist_status',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id').notNull(),
    checklistId: uuid('checklist_id').notNull(),
    status: checklistStatusEnum('status').default('pending'),
    completedAt: timestamp('completed_at').defaultNow(),
  },
  (t) => [index('employee_checklist_status_employee_id_idx').on(t.employeeId)],
);
