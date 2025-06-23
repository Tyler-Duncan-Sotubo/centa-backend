// src/modules/core/company/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

export const currencyEnum = pgEnum('currency_enum', [
  'NGN',
  'USD',
  'EUR',
  'GBP',
]);

export const planEnum = pgEnum('plan_enum', ['free', 'pro', 'enterprise']);

// --- COMPANIES TABLE ---
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    domain: varchar('domain', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),

    // Subscription & settings
    country: varchar('country', { length: 100 }).notNull(), // maybe keep just HQ country
    currency: currencyEnum('currency').notNull().default('NGN'),

    regNo: varchar('reg_no', { length: 100 }).notNull().default(''),
    logo_url: varchar('logo_url', { length: 255 }).notNull().default(''),

    // Primary contact
    primaryContactName: varchar('primary_contact_name', { length: 255 }),
    primaryContactEmail: varchar('primary_contact_email', { length: 255 }),
    primaryContactPhone: varchar('primary_contact_phone', { length: 20 }),

    subscriptionPlan: planEnum('subscription_plan').notNull().default('free'),
    trialEndsAt: timestamp('trial_ends_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_companies_domain').on(t.domain),
    index('idx_companies_country').on(t.country),
  ],
);

// Type helper
export type Company = typeof companies.$inferSelect;
