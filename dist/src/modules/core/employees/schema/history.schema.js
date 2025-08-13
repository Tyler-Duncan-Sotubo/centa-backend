"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeHistory = exports.historyTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("../schema/employee.schema");
exports.historyTypeEnum = (0, pg_core_1.pgEnum)('history_type', [
    'employment',
    'education',
    'certification',
    'promotion',
    'transfer',
    'termination',
]);
exports.employeeHistory = (0, pg_core_1.pgTable)('employee_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    type: (0, exports.historyTypeEnum)('type').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    startDate: (0, pg_core_1.date)('start_date'),
    endDate: (0, pg_core_1.date)('end_date'),
    institution: (0, pg_core_1.text)('institution'),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_history_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_history_type_idx').on(t.type),
    (0, pg_core_1.index)('employee_history_start_date_idx').on(t.startDate),
    (0, pg_core_1.index)('employee_history_end_date_idx').on(t.endDate),
    (0, pg_core_1.index)('employee_history_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=history.schema.js.map