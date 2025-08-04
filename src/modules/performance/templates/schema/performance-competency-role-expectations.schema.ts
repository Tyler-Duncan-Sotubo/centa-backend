import { pgTable, uuid } from 'drizzle-orm/pg-core';
import {
  companies,
  jobRoles,
  performanceCompetencies,
} from 'src/drizzle/schema';
import { competencyLevels } from './performance-competency-levels.schema';

export const roleCompetencyExpectations = pgTable(
  'performance_role_competency_expectations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),
    roleId: uuid('role_id')
      .references(() => jobRoles.id)
      .notNull(),
    competencyId: uuid('competency_id')
      .references(() => performanceCompetencies.id)
      .notNull(),
    expectedLevelId: uuid('expected_level_id')
      .references(() => competencyLevels.id)
      .notNull(),
  },
);
