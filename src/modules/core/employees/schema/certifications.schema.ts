// src/modules/core/employees/certifications/certifications.schema.ts

import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from '../schema/employee.schema';

export const employeeCertifications = pgTable(
  'employee_certifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    authority: text('authority'),
    licenseNumber: text('license_number'),
    issueDate: date('issue_date'),
    expiryDate: date('expiry_date'),
    documentUrl: text('document_url'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('employee_certifications_employee_id_idx').on(t.employeeId),
    index('employee_certifications_name_idx').on(t.name),
    index('employee_certifications_issue_date_idx').on(t.issueDate),
    index('employee_certifications_expiry_date_idx').on(t.expiryDate),
    index('employee_certifications_created_at_idx').on(t.createdAt),
  ],
);
