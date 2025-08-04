"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackRuleScopes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.feedbackRuleScopes = (0, pg_core_1.pgTable)('performance_feedback_rule_scopes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    ruleId: (0, pg_core_1.uuid)('rule_id').notNull(),
    type: (0, pg_core_1.text)('type').$type().notNull(),
    referenceId: (0, pg_core_1.uuid)('reference_id').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=performance-feedback-rules-scopes.schema.js.map