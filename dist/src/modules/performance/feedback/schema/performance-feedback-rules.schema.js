"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackRules = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.feedbackRules = (0, pg_core_1.pgTable)('performance_feedback_rules', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    group: (0, pg_core_1.text)('group').$type().notNull(),
    type: (0, pg_core_1.text)('type')
        .$type()
        .notNull(),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(false),
    officeOnly: (0, pg_core_1.boolean)('office_only').default(false),
    departmentOnly: (0, pg_core_1.boolean)('department_only').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
//# sourceMappingURL=performance-feedback-rules.schema.js.map