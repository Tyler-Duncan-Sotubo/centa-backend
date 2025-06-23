"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loanSequences = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.loanSequences = (0, pg_core_1.pgTable)('loan_sequences', {
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .primaryKey()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    nextNumber: (0, pg_core_1.integer)('next_number').notNull().default(1),
}, (t) => [(0, pg_core_1.index)('loan_sequences_next_number_idx').on(t.nextNumber)]);
//# sourceMappingURL=loan_sequences.schema.js.map