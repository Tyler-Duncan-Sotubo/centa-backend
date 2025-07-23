import {
  pgTable,
  uuid,
  integer,
  varchar,
  date,
  timestamp,
  index,
  decimal,
  json,
} from 'drizzle-orm/pg-core';
import { applications, OfferStatus } from '../../schema';
import { offerLetterTemplates } from '../offer-letter/schema/offer-letter-templates.schema';
import { companies } from 'src/drizzle/schema';

export const offers = pgTable(
  'offers',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),

    applicationId: uuid('application_id')
      .references(() => applications.id)
      .notNull(),

    templateId: uuid('template_id').references(() => offerLetterTemplates.id),
    status: OfferStatus('status').default('pending').notNull(),
    signingMethod: varchar('signing_method', { length: 20 })
      .default('pdf') // 'pdf' | 'docusign' | 'hellosign' etc.
      .notNull(),

    salary: decimal('salary', {
      precision: 15,
      scale: 2,
    }),

    currency: varchar('currency', { length: 3 }).default('NGN').notNull(),
    startDate: date('start_date'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    letterUrl: varchar('letter_url', { length: 500 }), // Un-signed
    signedLetterUrl: varchar('signed_letter_url', { length: 500 }), // Signed

    // For e-sign integrations
    signingProviderEnvelopeId: varchar('signing_envelope_id', { length: 255 }), // e.g., DocuSign envelopeId
    signingUrl: varchar('signing_url', { length: 500 }), // for redirecting candidate

    signedAt: timestamp('signed_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdBy: uuid('created_by'), // HR user

    version: integer('version').default(1),
    pdfData: json('pdf_data').$type<Record<string, any>>().notNull(), // <- new field

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_off_app').on(t.applicationId),
    index('idx_off_status').on(t.status),
    index('idx_off_signing_method').on(t.signingMethod),
  ],
);
