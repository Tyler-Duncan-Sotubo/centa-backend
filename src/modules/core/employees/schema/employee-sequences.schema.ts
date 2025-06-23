// src/modules/core/employees/employee-sequences.schema.ts

import { pgTable, uuid, integer, index } from 'drizzle-orm/pg-core';
import { companies } from '../../schema';

export const employeeSequences = pgTable(
  'employee_sequences',
  {
    companyId: uuid('company_id')
      .notNull()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    nextNumber: integer('next_number').notNull().default(1),
  },
  (t) => [index('employee_sequences_next_number_idx').on(t.nextNumber)],
);
