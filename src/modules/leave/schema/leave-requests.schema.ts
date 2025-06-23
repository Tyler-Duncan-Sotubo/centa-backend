import {
  pgTable,
  uuid,
  date,
  text,
  varchar,
  timestamp,
  decimal,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id').notNull(),
    leaveTypeId: uuid('leave_type_id').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).notNull(), // "pending", "approved", "rejected", "cancelled"

    totalDays: decimal('total_days', { precision: 5, scale: 2 })
      .notNull()
      .default('0.00'),

    approverId: uuid('approver_id'), // who approved or rejected
    approvedAt: timestamp('approved_at'),
    requestedAt: timestamp('requested_at').defaultNow(),
    rejectionReason: text('rejection_reason'),

    // 🔥 Multi-Level Approval Additions
    approvalChain: jsonb('approval_chain'),
    currentApprovalIndex: integer('current_approval_index').default(0),
    approvalHistory: jsonb('approval_history'),

    partialDay: varchar('partial_day', { length: 10 }), // AM, PM, FULL

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('leave_requests_company_id_idx').on(t.companyId),
    index('leave_requests_employee_id_idx').on(t.employeeId),
    index('leave_requests_leave_type_id_idx').on(t.leaveTypeId),
    index('leave_requests_status_idx').on(t.status),
    index('leave_requests_requested_at_idx').on(t.requestedAt),
    index('leave_requests_approved_at_idx').on(t.approvedAt),
    index('leave_requests_start_date_idx').on(t.startDate),
    index('leave_requests_end_date_idx').on(t.endDate),
  ],
);
