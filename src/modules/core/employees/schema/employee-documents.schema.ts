import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';

export const employeeDocuments = pgTable(
  'employee_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    /** Type: 'passport', 'NIN', 'birth_cert', 'offer_letter', etc */
    type: text('type').notNull(),

    /** File metadata */
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),

    /** Optional fields for offer letters and e-signature */
    templateId: uuid('template_id'), // only for offer letters
    signedUrl: text('signed_url'),
    docusignEnvelopeId: text('docusign_envelope_id'),
    status: text('status').default('uploaded'), // or: 'pending', 'signed', 'cancelled'

    uploadedAt: timestamp('uploaded_at').defaultNow(),
  },
  (t) => [index('idx_employee_documents_employee').on(t.employeeId)],
);
