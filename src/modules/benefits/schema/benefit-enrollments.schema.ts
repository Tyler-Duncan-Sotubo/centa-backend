import {
  pgTable,
  uuid,
  timestamp,
  index,
  boolean,
  text,
} from 'drizzle-orm/pg-core';
import { benefitPlans } from './benefit-plan.schema';
import { employees } from 'src/drizzle/schema';

export const benefitEnrollments = pgTable(
  'benefit_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    benefitPlanId: uuid('benefit_plan_id')
      .notNull()
      .references(() => benefitPlans.id),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),

    selectedCoverage: text('selected_coverage').notNull(),

    enrolledAt: timestamp('enrolled_at').defaultNow(),
    isOptedOut: boolean('is_opted_out').default(false),
  },
  (t) => [
    index('benefit_enrollments_benefit_plan_id_idx').on(t.benefitPlanId),
    index('benefit_enrollments_employee_id_idx').on(t.employeeId),
    index('benefit_enrollments_enrolled_at_idx').on(t.enrolledAt),
  ],
);
