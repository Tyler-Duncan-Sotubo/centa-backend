import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const googleAccounts = pgTable('google_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  googleEmail: varchar('google_email', { length: 255 }).notNull().unique(),

  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenType: varchar('token_type', { length: 32 }).notNull(),
  scope: text('scope').notNull(),

  expiryDate: timestamp('expiry_date', { withTimezone: false }).notNull(),
  refreshTokenExpiry: integer('refresh_token_expiry').default(604800),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
