import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { companies, users } from 'src/drizzle/schema';
import {
  employmentTypeEnum,
  JobStatus,
  jobTypeEnum,
} from '../../schema/recruitment-enums.schema';

export const job_postings = pgTable(
  'job_postings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),

    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    externalJobId: varchar('external_job_id', { length: 100 }).unique(),
    title: varchar('title', { length: 255 }).notNull(),

    country: varchar('country', { length: 100 }),
    state: varchar('state', { length: 100 }),
    city: varchar('city', { length: 100 }),

    jobType: jobTypeEnum('job_type').notNull(),
    employmentType: employmentTypeEnum('employment_type').notNull(),
    responsibilities: text('responsibilities').array(),
    requirements: text('requirements').array(),

    // job requirements
    experienceLevel: varchar('experience_level', { length: 50 }),
    yearsOfExperience: varchar('years_of_experience', { length: 50 }),
    qualification: varchar('education_level', { length: 50 }),

    // compensation
    salaryRangeFrom: integer('salary_range_from'),
    salaryRangeTo: integer('salary_range_to'),
    benefits: text('benefits').array(),
    currency: varchar('currency', { length: 10 }).default('NGN').notNull(),

    description: text('description'),
    status: JobStatus('status').default('draft').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deadlineDate: text('deadline_date'),

    isArchived: boolean('is_archived').default(false).notNull(),
  },
  (t) => [
    index('idx_job_company').on(t.companyId),
    index('idx_job_status').on(t.status),
    index('idx_job_posted_at').on(t.postedAt),
  ],
);
