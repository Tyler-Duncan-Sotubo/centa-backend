"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeDocuments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.employeeDocuments = (0, pg_core_1.pgTable)('employee_documents', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    fileUrl: (0, pg_core_1.text)('file_url').notNull(),
    templateId: (0, pg_core_1.uuid)('template_id'),
    signedUrl: (0, pg_core_1.text)('signed_url'),
    docusignEnvelopeId: (0, pg_core_1.text)('docusign_envelope_id'),
    status: (0, pg_core_1.text)('status').default('uploaded'),
    uploadedAt: (0, pg_core_1.timestamp)('uploaded_at').defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_employee_documents_employee').on(t.employeeId)]);
//# sourceMappingURL=employee-documents.schema.js.map