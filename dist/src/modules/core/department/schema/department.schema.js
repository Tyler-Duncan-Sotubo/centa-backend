"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    headId: (0, pg_core_1.uuid)('head_id').references(() => schema_1.employees.id, {
        onDelete: 'set null',
    }),
    parentDepartmentId: (0, pg_core_1.uuid)('parent_department_id').references(() => exports.departments.id, { onDelete: 'set null' }),
    costCenterId: (0, pg_core_1.uuid)('cost_center_id').references(() => schema_1.costCenters.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_departments_company_name').on(t.companyId, t.name),
    (0, pg_core_1.index)('idx_departments_company').on(t.companyId),
]);
//# sourceMappingURL=department.schema.js.map