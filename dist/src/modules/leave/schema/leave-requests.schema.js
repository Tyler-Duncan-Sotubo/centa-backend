"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.leaveRequests = (0, pg_core_1.pgTable)('leave_requests', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    leaveTypeId: (0, pg_core_1.uuid)('leave_type_id').notNull(),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date').notNull(),
    reason: (0, pg_core_1.text)('reason'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).notNull(),
    totalDays: (0, pg_core_1.decimal)('total_days', { precision: 5, scale: 2 })
        .notNull()
        .default('0.00'),
    approverId: (0, pg_core_1.uuid)('approver_id'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at'),
    requestedAt: (0, pg_core_1.timestamp)('requested_at').defaultNow(),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    approvalChain: (0, pg_core_1.jsonb)('approval_chain'),
    currentApprovalIndex: (0, pg_core_1.integer)('current_approval_index').default(0),
    approvalHistory: (0, pg_core_1.jsonb)('approval_history'),
    partialDay: (0, pg_core_1.varchar)('partial_day', { length: 10 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('leave_requests_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('leave_requests_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('leave_requests_leave_type_id_idx').on(t.leaveTypeId),
    (0, pg_core_1.index)('leave_requests_status_idx').on(t.status),
    (0, pg_core_1.index)('leave_requests_requested_at_idx').on(t.requestedAt),
    (0, pg_core_1.index)('leave_requests_approved_at_idx').on(t.approvedAt),
    (0, pg_core_1.index)('leave_requests_start_date_idx').on(t.startDate),
    (0, pg_core_1.index)('leave_requests_end_date_idx').on(t.endDate),
]);
//# sourceMappingURL=leave-requests.schema.js.map