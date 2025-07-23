"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.candidates = (0, pg_core_1.pgTable)('candidates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    fullName: (0, pg_core_1.varchar)('full_name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    source: (0, schema_1.CandidateSource)('source').default('career_page').notNull(),
    resumeUrl: (0, pg_core_1.varchar)('resume_url', { length: 500 }),
    profile: (0, pg_core_1.jsonb)('profile'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_cand_email').on(t.email),
    (0, pg_core_1.index)('idx_cand_source').on(t.source),
]);
//# sourceMappingURL=candidates.schema.js.map