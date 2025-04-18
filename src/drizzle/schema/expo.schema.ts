import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';

export const expo_tokens = pgTable('expo_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  expoPushToken: text('expo_push_token'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
