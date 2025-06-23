"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeShifts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const schema_2 = require("../../../drizzle/schema");
const shifts_schema_1 = require("./shifts.schema");
exports.employeeShifts = (0, pg_core_1.pgTable)('employee_shifts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_2.employees.id, { onDelete: 'cascade' }),
    shiftId: (0, pg_core_1.uuid)('shift_id').references(() => shifts_schema_1.shifts.id, {
        onDelete: 'cascade',
    }),
    shiftDate: (0, pg_core_1.date)('shift_date').notNull(),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_shifts_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('employee_shifts_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_shifts_shift_id_idx').on(t.shiftId),
    (0, pg_core_1.index)('employee_shifts_shift_date_idx').on(t.shiftDate),
    (0, pg_core_1.index)('employee_shifts_is_deleted_idx').on(t.isDeleted),
    (0, pg_core_1.index)('employee_shifts_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=employee-shifts.schema.js.map