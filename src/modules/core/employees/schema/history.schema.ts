// src/modules/core/employees/history/history.schema.ts
import {
  pgTable,
  uuid,
  text,
  date,
  pgEnum,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from '../schema/employee.schema';

export const historyTypeEnum = pgEnum('history_type', [
  'employment',
  'education',
  'certification',
  'promotion',
  'transfer',
  'termination',
]);

export const employeeHistory = pgTable(
  'employee_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    type: historyTypeEnum('type').notNull(),
    title: text('title').notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    institution: text('institution'),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('employee_history_employee_id_idx').on(t.employeeId),
    index('employee_history_type_idx').on(t.type),
    index('employee_history_start_date_idx').on(t.startDate),
    index('employee_history_end_date_idx').on(t.endDate),
    index('employee_history_created_at_idx').on(t.createdAt),
  ],
);
