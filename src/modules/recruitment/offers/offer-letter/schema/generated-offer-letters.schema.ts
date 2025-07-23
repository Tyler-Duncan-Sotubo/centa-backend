import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { offers } from '../../schema/offers.schema';
import { offerLetterTemplates } from './offer-letter-templates.schema';

export const generatedOfferLetters = pgTable(
  'generated_offer_letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    candidateId: uuid('candidate_id').notNull(),

    offerId: uuid('offer_id').references(() => offers.id, {
      onDelete: 'cascade',
    }),

    templateId: uuid('template_id')
      .references(() => offerLetterTemplates.id)
      .notNull(),

    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileUrl: text('file_url').notNull(),

    status: varchar('status', { length: 20 }).default('pending'),

    generatedBy: uuid('generated_by'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_offer_letter_offer_id').on(t.offerId),
    index('idx_offer_letter_candidate_id').on(t.candidateId),
    index('idx_offer_letter_template_id').on(t.templateId),
    index('idx_offer_letter_status').on(t.status),
  ],
);
