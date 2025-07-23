"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interview_scores = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const interviews_schema_1 = require("./interviews.schema");
const scorecard_criteria_schema_1 = require("./scorecard-criteria.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.interview_scores = (0, pg_core_1.pgTable)('interview_scores', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    interviewId: (0, pg_core_1.uuid)('interview_id')
        .notNull()
        .references(() => interviews_schema_1.interviews.id, { onDelete: 'cascade' }),
    criterionId: (0, pg_core_1.uuid)('criterion_id')
        .notNull()
        .references(() => scorecard_criteria_schema_1.scorecard_criteria.id, { onDelete: 'cascade' }),
    score: (0, pg_core_1.integer)('score').notNull(),
    comment: (0, pg_core_1.text)('comment'),
    submittedBy: (0, pg_core_1.uuid)('submitted_by').references(() => schema_1.users.id),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at', { withTimezone: true }).defaultNow(),
});
//# sourceMappingURL=interview-scores.schema.js.map