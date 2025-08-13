// modules/employees/groups/group.schema.ts
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { employees } from '../schema/employee.schema';
import { companies } from '../../schema';

export const groups = pgTable('employee_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
});

export const groupMemberships = pgTable(
  'employee_group_memberships',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (t) => [index('idx_employee_group_memberships').on(t.employeeId)],
);
