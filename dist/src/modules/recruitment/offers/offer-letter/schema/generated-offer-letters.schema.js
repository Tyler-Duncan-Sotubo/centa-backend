"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedOfferLetters = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const offers_schema_1 = require("../../schema/offers.schema");
const offer_letter_templates_schema_1 = require("./offer-letter-templates.schema");
exports.generatedOfferLetters = (0, pg_core_1.pgTable)('generated_offer_letters', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    candidateId: (0, pg_core_1.uuid)('candidate_id').notNull(),
    offerId: (0, pg_core_1.uuid)('offer_id').references(() => offers_schema_1.offers.id, {
        onDelete: 'cascade',
    }),
    templateId: (0, pg_core_1.uuid)('template_id')
        .references(() => offer_letter_templates_schema_1.offerLetterTemplates.id)
        .notNull(),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
    fileUrl: (0, pg_core_1.text)('file_url').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending'),
    generatedBy: (0, pg_core_1.uuid)('generated_by'),
    generatedAt: (0, pg_core_1.timestamp)('generated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_offer_letter_offer_id').on(t.offerId),
    (0, pg_core_1.index)('idx_offer_letter_candidate_id').on(t.candidateId),
    (0, pg_core_1.index)('idx_offer_letter_template_id').on(t.templateId),
    (0, pg_core_1.index)('idx_offer_letter_status').on(t.status),
]);
//# sourceMappingURL=generated-offer-letters.schema.js.map