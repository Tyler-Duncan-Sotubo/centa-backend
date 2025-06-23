"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservedLeaveDays = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const leave_types_schema_1 = require("../../schema/leave-types.schema");
exports.reservedLeaveDays = (0, pg_core_1.pgTable)('reserved_leave_days', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id').references(() => schema_1.employees.id, {
        onDelete: 'cascade',
    }),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    leaveTypeId: (0, pg_core_1.uuid)('leave_type_id')
        .notNull()
        .references(() => leave_types_schema_1.leaveTypes.id, { onDelete: 'cascade' }),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    startDate: (0, pg_core_1.text)('start_date').notNull(),
    endDate: (0, pg_core_1.text)('end_date').notNull(),
    reason: (0, pg_core_1.text)('reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=reserved-day.schema.js.map