import {
  pgTable,
  uuid,
  text,
  pgEnum,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from 'src/drizzle/schema';

export const lifecycleTokenType = pgEnum('lifecycle_token_type', [
  'onboarding',
  'offboarding',
]);

export const employeeLifecycleTokens = pgTable(
  'employee_lifecycle_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    type: lifecycleTokenType('type').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    used: boolean('used').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('lifecycle_tokens_employee_id_idx').on(t.employeeId),
    index('lifecycle_tokens_type_idx').on(t.type),
  ],
);
