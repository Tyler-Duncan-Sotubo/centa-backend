"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.job_postings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const recruitment_enums_schema_1 = require("../../schema/recruitment-enums.schema");
exports.job_postings = (0, pg_core_1.pgTable)('job_postings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id, { onDelete: 'cascade' })
        .notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .references(() => schema_1.users.id, { onDelete: 'cascade' })
        .notNull(),
    externalJobId: (0, pg_core_1.varchar)('external_job_id', { length: 100 }).unique(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    country: (0, pg_core_1.varchar)('country', { length: 100 }),
    state: (0, pg_core_1.varchar)('state', { length: 100 }),
    city: (0, pg_core_1.varchar)('city', { length: 100 }),
    jobType: (0, recruitment_enums_schema_1.jobTypeEnum)('job_type').notNull(),
    employmentType: (0, recruitment_enums_schema_1.employmentTypeEnum)('employment_type').notNull(),
    responsibilities: (0, pg_core_1.text)('responsibilities').array(),
    requirements: (0, pg_core_1.text)('requirements').array(),
    experienceLevel: (0, pg_core_1.varchar)('experience_level', { length: 50 }),
    yearsOfExperience: (0, pg_core_1.varchar)('years_of_experience', { length: 50 }),
    qualification: (0, pg_core_1.varchar)('education_level', { length: 50 }),
    salaryRangeFrom: (0, pg_core_1.integer)('salary_range_from'),
    salaryRangeTo: (0, pg_core_1.integer)('salary_range_to'),
    benefits: (0, pg_core_1.text)('benefits').array(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).default('NGN').notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, recruitment_enums_schema_1.JobStatus)('status').default('draft').notNull(),
    postedAt: (0, pg_core_1.timestamp)('posted_at', { withTimezone: true }),
    closedAt: (0, pg_core_1.timestamp)('closed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
    deadlineDate: (0, pg_core_1.text)('deadline_date'),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false).notNull(),
}, (t) => [
    (0, pg_core_1.index)('idx_job_company').on(t.companyId),
    (0, pg_core_1.index)('idx_job_status').on(t.status),
    (0, pg_core_1.index)('idx_job_posted_at').on(t.postedAt),
]);
//# sourceMappingURL=job-postings.schema.js.map