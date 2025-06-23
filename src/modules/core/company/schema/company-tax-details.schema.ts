import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { companies } from './company.schema'; // Import the companies table

export const companyTaxDetails = pgTable(
  'company_tax_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }), // Foreign key reference to companies

    tin: text('tin').notNull(), // Tax Identification Number
    vatNumber: text('vat_number'), // VAT Registration Number
    nhfCode: text('nhf_code'), // NHF Contribution Code
    pensionCode: text('pension_code'), // Pension Scheme Code

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_company_id_tax_details').on(table.companyId),
    index('idx_tin_tax_details').on(table.tin),
  ],
);
