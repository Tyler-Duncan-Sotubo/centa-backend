// modules/employees/groups/group.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  boolean,
  integer,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { employees } from '../schema/employee.schema';
import { companies } from '../../schema';

/** Enumerations **/
export const groupTypeEnum = pgEnum('group_type', [
  'TEAM', // default: teams/org units used for org chart, goals, etc.
  'PROJECT', // project/squad (often temporary)
  'INTEREST', // communities/guilds
  'SECURITY', // security/permission groups (if you reuse table)
]);

export const memberRoleEnum = pgEnum('group_member_role', [
  'member',
  'lead',
  'manager',
  'contractor',
]);

/** Groups -> now “Teams” capable */
export const groups = pgTable(
  'employee_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }), // nice URLs / stable identifiers

    type: groupTypeEnum('type').notNull().default('TEAM'),
    parentGroupId: uuid('parent_group_id').references(() => groups.id, {
      onDelete: 'set null',
    }),

    // optional metadata that’s handy for HR/Finance reporting
    location: varchar('location', { length: 100 }),
    timezone: varchar('timezone', { length: 64 }),
    headcountCap: integer('headcount_cap'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // Fast lookups by company & type
    index('idx_groups_company_type').on(t.companyId, t.type),
    index('idx_groups_parent').on(t.parentGroupId),

    // Keep names/links clean per company
    uniqueIndex('uniq_groups_company_name').on(t.companyId, t.name),
    uniqueIndex('uniq_groups_company_slug').on(t.companyId, t.slug),
  ],
);

/** Memberships -> richer “Team Memberships” */
export const groupMemberships = pgTable(
  'employee_group_memberships',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    // Team semantics
    role: memberRoleEnum('role').notNull().default('member'),
    isPrimary: boolean('is_primary').notNull().default(false), // mark one main team (enforce in service)
    title: varchar('title', { length: 120 }), // e.g., "Engineering Manager"

    // Effective dating (historical org charts / transfers)
    startDate: date('start_date'),
    endDate: date('end_date'),

    // Optional FTE allocation (0–100)
    allocationPct: integer('allocation_pct'), // validate 0..100 in service/DTO

    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // Prevent duplicate memberships
    uniqueIndex('pk_group_membership_composite').on(t.groupId, t.employeeId),

    // Common filters
    index('idx_group_memberships_group').on(t.groupId),
    index('idx_group_memberships_employee').on(t.employeeId),
    index('idx_group_memberships_primary').on(t.employeeId, t.isPrimary),
  ],
);
