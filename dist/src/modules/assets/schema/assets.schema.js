"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.assets = (0, pg_core_1.pgTable)('assets', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    internalId: (0, pg_core_1.varchar)('internal_id', { length: 20 }).notNull().unique(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    modelName: (0, pg_core_1.varchar)('model_name', { length: 255 }),
    color: (0, pg_core_1.varchar)('color', { length: 255 }),
    specs: (0, pg_core_1.text)('specs'),
    category: (0, pg_core_1.varchar)('category', { length: 255 }).notNull(),
    manufacturer: (0, pg_core_1.varchar)('manufacturer', { length: 255 }),
    serialNumber: (0, pg_core_1.varchar)('serial_number', { length: 255 }).notNull(),
    purchasePrice: (0, pg_core_1.decimal)('purchase_price', {
        precision: 10,
        scale: 2,
    }).notNull(),
    purchaseDate: (0, pg_core_1.date)('purchase_date').notNull(),
    depreciationMethod: (0, pg_core_1.varchar)('depreciation_method', { length: 50 }),
    warrantyExpiry: (0, pg_core_1.date)('warranty_expiry'),
    lendDate: (0, pg_core_1.date)('lend_date'),
    returnDate: (0, pg_core_1.date)('return_date'),
    usefulLifeYears: (0, pg_core_1.integer)('useful_life_years').notNull().default(3),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id').references(() => schema_1.employees.id),
    locationId: (0, pg_core_1.uuid)('location_id')
        .notNull()
        .references(() => schema_1.companyLocations.id),
    status: (0, pg_core_1.varchar)('status').default('available').notNull(),
    createdAt: (0, pg_core_1.date)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.date)('updated_at').defaultNow(),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
}, (t) => [
    (0, pg_core_1.index)('assets_internal_id_idx').on(t.internalId),
    (0, pg_core_1.index)('assets_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('assets_location_id_idx').on(t.locationId),
    (0, pg_core_1.index)('assets_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('assets_category_idx').on(t.category),
    (0, pg_core_1.index)('assets_status_idx').on(t.status),
    (0, pg_core_1.index)('assets_purchase_date_idx').on(t.purchaseDate),
]);
//# sourceMappingURL=assets.schema.js.map