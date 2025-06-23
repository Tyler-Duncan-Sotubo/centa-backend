import { pgTable, uuid, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/modules/core/schema';
import { onboardingTemplates } from './onboarding-templates.schema';

export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const employeeOnboarding = pgTable(
  'employee_onboarding',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => onboardingTemplates.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }), // optional: cascade

    status: onboardingStatusEnum('status').default('pending'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('employee_onboarding_employee_id_idx').on(t.employeeId),
    index('employee_onboarding_template_id_idx').on(t.templateId),
    index('employee_onboarding_status_idx').on(t.status),
    index('employee_onboarding_company_id_idx').on(t.companyId),
  ],
);
