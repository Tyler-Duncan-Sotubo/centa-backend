import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

// Define the role enum
export const roleEnum = pgEnum('role_enum', [
  'admin',
  'hr_manager',
  'employee',
  'payroll_specialist',
  'super_admin',
]);

// Define the users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    first_name: text('first_name'),
    last_name: text('last_name'),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: roleEnum('role').notNull().default('employee'), // Add role column
    plan: text('plan').default('free'),
    is_verified: boolean('is_verified').default(false),
    last_login: timestamp('last_login'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
    avatar: text('avatar'),

    company_id: uuid('company_id') // <-- Add this line
      .references(() => companies.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('email_idx').on(table.email)],
);

// Types
export type User = typeof users.$inferSelect;
export type UserById = Pick<User, 'id'>;
