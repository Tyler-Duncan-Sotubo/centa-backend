import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companies, companyRoles } from 'src/drizzle/schema';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    plan: varchar('plan', { length: 50 }).notNull().default('free'),
    isVerified: boolean('is_verified').notNull().default(false),
    lastLogin: timestamp('last_login', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    avatar: varchar('avatar', { length: 500 }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    companyRoleId: uuid('company_role_id')
      .notNull()
      .references(() => companyRoles.id, { onDelete: 'cascade' }),

    verificationCode: varchar('verification_code', { length: 6 }),
    verificationCodeExpiresAt: timestamp('verification_code_expires_at', {
      mode: 'date',
    }),
  },
  (table) => [
    uniqueIndex('email_idx').on(table.email),
    index('idx_company_id').on(table.companyId),
    index('idx_company_role_id').on(table.companyRoleId),
  ],
);
