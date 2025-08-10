"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeDependents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.employeeDependents = (0, pg_core_1.pgTable)('employee_dependents', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    relationship: (0, pg_core_1.text)('relationship').notNull(),
    dateOfBirth: (0, pg_core_1.date)('date_of_birth').notNull(),
    isBeneficiary: (0, pg_core_1.boolean)('is_beneficiary').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_dependents_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_dependents_name_idx').on(t.name),
    (0, pg_core_1.index)('employee_dependents_relationship_idx').on(t.relationship),
    (0, pg_core_1.index)('employee_dependents_date_of_birth_idx').on(t.dateOfBirth),
    (0, pg_core_1.index)('employee_dependents_is_beneficiary_idx').on(t.isBeneficiary),
    (0, pg_core_1.index)('employee_dependents_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=dependents.schema.js.map