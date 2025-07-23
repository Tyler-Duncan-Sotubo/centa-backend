"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewEmailTemplates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.interviewEmailTemplates = (0, pg_core_1.pgTable)('interview_email_templates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    subject: (0, pg_core_1.text)('subject').notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id),
    createdBy: (0, pg_core_1.uuid)('created_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
//# sourceMappingURL=interview-email-templates.schema.js.map