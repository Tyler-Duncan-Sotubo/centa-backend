"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeCertifications = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.employeeCertifications = (0, pg_core_1.pgTable)('employee_certifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    authority: (0, pg_core_1.text)('authority'),
    licenseNumber: (0, pg_core_1.text)('license_number'),
    issueDate: (0, pg_core_1.date)('issue_date'),
    expiryDate: (0, pg_core_1.date)('expiry_date'),
    documentUrl: (0, pg_core_1.text)('document_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_certifications_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_certifications_name_idx').on(t.name),
    (0, pg_core_1.index)('employee_certifications_issue_date_idx').on(t.issueDate),
    (0, pg_core_1.index)('employee_certifications_expiry_date_idx').on(t.expiryDate),
    (0, pg_core_1.index)('employee_certifications_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=certifications.schema.js.map