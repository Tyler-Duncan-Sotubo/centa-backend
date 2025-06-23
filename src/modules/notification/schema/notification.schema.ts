import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { employees } from 'src/drizzle/schema'; // Import employees

export const notification = pgTable(
  'notification',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    message: text('message').notNull(),
    type: text('type').notNull(),
    read: text('read').notNull().default('false'),
    url: text('url').notNull(),

    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employee_id: uuid('employee_id') // 👈 Add this
      .references(() => employees.id, { onDelete: 'cascade' }),

    created_at: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('notifications_company_id_idx').on(t.company_id),
    index('notifications_employee_id_idx').on(t.employee_id), // 👈 Index this
    index('notifications_type_idx').on(t.type),
    index('notifications_read_idx').on(t.read),
    index('notifications_created_at_idx').on(t.created_at),
  ],
);
