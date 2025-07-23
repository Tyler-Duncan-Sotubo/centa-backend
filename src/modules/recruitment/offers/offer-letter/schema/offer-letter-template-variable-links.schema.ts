import { pgTable, uuid, index } from 'drizzle-orm/pg-core';
import { offerLetterTemplateVariables } from './offer-letter-template-variables.schema';
import { offerLetterTemplates } from './offer-letter-templates.schema';

export const offerLetterTemplateVariableLinks = pgTable(
  'offer_letter_template_variable_links',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => offerLetterTemplates.id, { onDelete: 'cascade' }),
    variableId: uuid('variable_id')
      .notNull()
      .references(() => offerLetterTemplateVariables.id, {
        onDelete: 'cascade',
      }),
  },
  (t) => [index('template_variable_link_idx').on(t.templateId, t.variableId)],
);
