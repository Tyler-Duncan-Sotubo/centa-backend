import {
  pgTable,
  uuid,
  integer,
  boolean,
  varchar,
  jsonb,
  timestamp,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { leaveTypes } from './leave-types.schema';

export const leavePolicies = pgTable(
  'leave_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    leaveTypeId: uuid('leave_type_id')
      .notNull()
      .references(() => leaveTypes.id, { onDelete: 'cascade' }),

    accrualEnabled: boolean('accrual_enabled').default(false),

    accrualFrequency: varchar('accrual_frequency', { length: 20 }), // "monthly", "quarterly", "annually"

    accrualAmount: decimal('accrual_amount', { precision: 5, scale: 2 }), // days earned per period

    maxBalance: integer('max_balance'), // optional cap

    allowCarryover: boolean('allow_carryover').default(false),

    carryoverLimit: integer('carryover_limit'), // max days carried over

    onlyConfirmedEmployees: boolean('only_confirmed_employees').default(false),
    genderEligibility: varchar('gender_eligibility', { length: 10 }), // "male", "female", "any"

    manualEntitlement: integer('manual_entitlement'), // if accrual is false
    grantOnStart: boolean('grant_on_start').default(true), // when to give manual entitlement

    eligibilityRules: jsonb('eligibility_rules'), // JSON filters (e.g., country, department)
    isSplittable: boolean('is_splittable').default(true), // can this leave be broken into multiple periods?

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('leave_policies_company_id_idx').on(t.companyId),
    index('leave_policies_leave_type_id_idx').on(t.leaveTypeId),
    index('leave_policies_accrual_enabled_idx').on(t.accrualEnabled),
    index('leave_policies_accrual_frequency_idx').on(t.accrualFrequency),
    index('leave_policies_gender_eligibility_idx').on(t.genderEligibility),
    index('leave_policies_created_at_idx').on(t.createdAt),
  ],
);
