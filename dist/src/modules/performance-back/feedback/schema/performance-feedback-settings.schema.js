"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackSettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.feedbackSettings = (0, pg_core_1.pgTable)('performance_feedback_settings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    enableEmployeeFeedback: (0, pg_core_1.boolean)('enable_employee_feedback').default(true),
    enableManagerFeedback: (0, pg_core_1.boolean)('enable_manager_feedback').default(true),
    allowAnonymous: (0, pg_core_1.boolean)('allow_anonymous').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at'),
});
//# sourceMappingURL=performance-feedback-settings.schema.js.map