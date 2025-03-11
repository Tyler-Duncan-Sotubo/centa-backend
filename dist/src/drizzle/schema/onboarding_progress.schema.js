"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingProgress = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
exports.onboardingProgress = (0, pg_core_1.pgTable)('onboarding_progress', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    taskKey: (0, pg_core_1.varchar)('task_key', { length: 255 }).notNull(),
    completed: (0, pg_core_1.boolean)('completed').default(false).notNull(),
    url: (0, pg_core_1.varchar)('url', { length: 255 }).notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { mode: 'date' }),
});
//# sourceMappingURL=onboarding_progress.schema.js.map