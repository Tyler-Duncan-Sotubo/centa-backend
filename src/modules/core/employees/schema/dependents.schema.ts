// src/modules/core/employees/dependents/dependents.schema.ts

import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from '../schema/employee.schema';

export const employeeDependents = pgTable(
  'employee_dependents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    relationship: text('relationship').notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    isBeneficiary: boolean('is_beneficiary').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('employee_dependents_employee_id_idx').on(t.employeeId),
    index('employee_dependents_name_idx').on(t.name),
    index('employee_dependents_relationship_idx').on(t.relationship),
    index('employee_dependents_date_of_birth_idx').on(t.dateOfBirth),
    index('employee_dependents_is_beneficiary_idx').on(t.isBeneficiary),
    index('employee_dependents_created_at_idx').on(t.createdAt),
  ],
);
