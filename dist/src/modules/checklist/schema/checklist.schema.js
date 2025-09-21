"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checklistCompletion = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.checklistCompletion = (0, pg_core_1.pgTable)('checklist_completion', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.varchar)('company_id').notNull(),
    checklistKey: (0, pg_core_1.varchar)('checklist_key').notNull(),
    completedBy: (0, pg_core_1.varchar)('completed_by').notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('checklist_completion_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('checklist_completion_checklist_key_idx').on(t.checklistKey),
    (0, pg_core_1.uniqueIndex)('checklist_completion_company_key_unq').on(t.companyId, t.checklistKey),
]);
//# sourceMappingURL=checklist.schema.js.map