import { pgTable, uuid, integer, index } from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const loanSequences = pgTable(
  'loan_sequences',
  {
    companyId: uuid('company_id')
      .notNull()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    nextNumber: integer('next_number').notNull().default(1),
  },
  (t) => [index('loan_sequences_next_number_idx').on(t.nextNumber)],
);
