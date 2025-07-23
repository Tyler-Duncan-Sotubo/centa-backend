import { pgTable, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { candidates } from './candidates.schema';

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const candidate_skills = pgTable(
  'candidate_skills',
  {
    candidateId: uuid('candidate_id')
      .references(() => candidates.id, { onDelete: 'cascade' })
      .notNull(),
    skillId: uuid('skill_id')
      .references(() => skills.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [index('idx_candskill_cand').on(t.candidateId)],
);
