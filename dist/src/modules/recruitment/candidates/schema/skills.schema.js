"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidate_skills = exports.skills = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const candidates_schema_1 = require("./candidates.schema");
exports.skills = (0, pg_core_1.pgTable)('skills', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
});
exports.candidate_skills = (0, pg_core_1.pgTable)('candidate_skills', {
    candidateId: (0, pg_core_1.uuid)('candidate_id')
        .references(() => candidates_schema_1.candidates.id, { onDelete: 'cascade' })
        .notNull(),
    skillId: (0, pg_core_1.uuid)('skill_id')
        .references(() => exports.skills.id, { onDelete: 'cascade' })
        .notNull(),
}, (t) => [(0, pg_core_1.index)('idx_candskill_cand').on(t.candidateId)]);
//# sourceMappingURL=skills.schema.js.map