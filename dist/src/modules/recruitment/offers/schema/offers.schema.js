"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
const offer_letter_templates_schema_1 = require("../offer-letter/schema/offer-letter-templates.schema");
const schema_2 = require("../../../../drizzle/schema");
exports.offers = (0, pg_core_1.pgTable)('offers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_2.companies.id, { onDelete: 'cascade' })
        .notNull(),
    applicationId: (0, pg_core_1.uuid)('application_id')
        .references(() => schema_1.applications.id)
        .notNull(),
    templateId: (0, pg_core_1.uuid)('template_id').references(() => offer_letter_templates_schema_1.offerLetterTemplates.id),
    status: (0, schema_1.OfferStatus)('status').default('pending').notNull(),
    signingMethod: (0, pg_core_1.varchar)('signing_method', { length: 20 })
        .default('pdf')
        .notNull(),
    salary: (0, pg_core_1.decimal)('salary', {
        precision: 15,
        scale: 2,
    }),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).default('NGN').notNull(),
    startDate: (0, pg_core_1.date)('start_date'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }),
    letterUrl: (0, pg_core_1.varchar)('letter_url', { length: 500 }),
    signedLetterUrl: (0, pg_core_1.varchar)('signed_letter_url', { length: 500 }),
    signingProviderEnvelopeId: (0, pg_core_1.varchar)('signing_envelope_id', { length: 255 }),
    signingUrl: (0, pg_core_1.varchar)('signing_url', { length: 500 }),
    signedAt: (0, pg_core_1.timestamp)('signed_at', { withTimezone: true }),
    sentAt: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    createdBy: (0, pg_core_1.uuid)('created_by'),
    version: (0, pg_core_1.integer)('version').default(1),
    pdfData: (0, pg_core_1.json)('pdf_data').$type().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_off_app').on(t.applicationId),
    (0, pg_core_1.index)('idx_off_status').on(t.status),
    (0, pg_core_1.index)('idx_off_signing_method').on(t.signingMethod),
]);
//# sourceMappingURL=offers.schema.js.map