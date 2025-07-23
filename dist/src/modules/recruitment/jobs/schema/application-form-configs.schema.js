"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.application_form_configs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const job_postings_schema_1 = require("./job-postings.schema");
const schema_1 = require("../../schema");
exports.application_form_configs = (0, pg_core_1.pgTable)('application_form_configs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    jobId: (0, pg_core_1.uuid)('job_id')
        .notNull()
        .references(() => job_postings_schema_1.job_postings.id, { onDelete: 'cascade' })
        .unique(),
    style: (0, schema_1.applicationStyleEnum)('style').notNull(),
    includeReferences: (0, pg_core_1.boolean)('include_references').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
});
//# sourceMappingURL=application-form-configs.schema.js.map