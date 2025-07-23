"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.application_question_responses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_schema_1 = require("./applications.schema");
exports.application_question_responses = (0, pg_core_1.pgTable)('application_question_responses', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)('application_id')
        .notNull()
        .references(() => applications_schema_1.applications.id, { onDelete: 'cascade' }),
    question: (0, pg_core_1.text)('question').notNull(),
    answer: (0, pg_core_1.text)('answer').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
});
//# sourceMappingURL=application-question-responses.schema.js.map