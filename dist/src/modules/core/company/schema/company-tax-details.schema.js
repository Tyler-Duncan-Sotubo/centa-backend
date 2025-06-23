"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyTaxDetails = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
exports.companyTaxDetails = (0, pg_core_1.pgTable)('company_tax_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    tin: (0, pg_core_1.text)('tin').notNull(),
    vatNumber: (0, pg_core_1.text)('vat_number'),
    nhfCode: (0, pg_core_1.text)('nhf_code'),
    pensionCode: (0, pg_core_1.text)('pension_code'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_tax_details').on(table.companyId),
    (0, pg_core_1.index)('idx_tin_tax_details').on(table.tin),
]);
//# sourceMappingURL=company-tax-details.schema.js.map