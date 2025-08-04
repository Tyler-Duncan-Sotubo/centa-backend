"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appraisals = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_appraisal_cycle_schema_1 = require("./performance-appraisal-cycle.schema");
exports.appraisals = (0, pg_core_1.pgTable)('performance_appraisals', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    cycleId: (0, pg_core_1.uuid)('cycle_id')
        .references(() => performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id)
        .notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    managerId: (0, pg_core_1.uuid)('manager_id').notNull(),
    submittedByEmployee: (0, pg_core_1.boolean)('submitted_by_employee').default(false),
    submittedByManager: (0, pg_core_1.boolean)('submitted_by_manager').default(false),
    finalized: (0, pg_core_1.boolean)('finalized').default(false),
    finalScore: (0, pg_core_1.integer)('final_score'),
    promotionRecommendation: (0, pg_core_1.text)('promotion_recommendation', {
        enum: ['promote', 'hold', 'exit'],
    }),
    finalNote: (0, pg_core_1.text)('final_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=performance-appraisals.schema.js.map