import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { companies, employees, users } from 'src/drizzle/schema';
import { leaveTypes } from '../../schema/leave-types.schema';

export const reservedLeaveDays = pgTable('reserved_leave_days', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').references(() => employees.id, {
    onDelete: 'cascade',
  }),
  companyId: uuid('company_id').references(() => companies.id, {
    onDelete: 'cascade',
  }),

  leaveTypeId: uuid('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id, { onDelete: 'cascade' }),

  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // reference to a user/admin

  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),

  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});
