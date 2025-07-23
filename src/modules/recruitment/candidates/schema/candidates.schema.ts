import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { CandidateSource } from '../../schema';

export const candidates = pgTable(
  'candidates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    source: CandidateSource('source').default('career_page').notNull(),
    resumeUrl: varchar('resume_url', { length: 500 }),
    profile: jsonb('profile'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_cand_email').on(t.email),
    index('idx_cand_source').on(t.source),
  ],
);
