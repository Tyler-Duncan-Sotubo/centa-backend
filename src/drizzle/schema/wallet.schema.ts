import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: integer('id').primaryKey().notNull(), // paystack customer id
  customer_code: varchar('customer_code', { length: 255 }).notNull().unique(), // important for future calls
  email: varchar('email', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const wallets = pgTable('wallets', {
  id: integer('id').primaryKey().notNull(),
  customer_id: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  customer_code: varchar('customer_code', { length: 255 }).notNull(),

  bank_id: integer('bank_id').notNull(),
  bank_name: varchar('bank_name', { length: 100 }).notNull(),
  bank_slug: varchar('bank_slug', { length: 100 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),

  account_name: varchar('account_name', { length: 255 }).notNull(),
  account_number: varchar('account_number', { length: 20 }).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});
