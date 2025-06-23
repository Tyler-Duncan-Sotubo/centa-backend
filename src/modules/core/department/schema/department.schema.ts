import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies, costCenters, employees } from 'src/drizzle/schema';

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    headId: uuid('head_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    parentDepartmentId: uuid('parent_department_id').references(
      () => departments.id,
      { onDelete: 'set null' },
    ),

    costCenterId: uuid('cost_center_id').references(() => costCenters.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_departments_company_name').on(t.companyId, t.name),
    index('idx_departments_company').on(t.companyId),
  ],
);
