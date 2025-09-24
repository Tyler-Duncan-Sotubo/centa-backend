import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import {
  companies,
  companyLocations,
  departments,
  users,
} from 'src/drizzle/schema';

export const announcementCategories = pgTable(
  'announcement_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('announcement_categories_company_id_idx').on(t.companyId),
    index('announcement_categories_id_idx').on(t.id),
  ],
);

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    image: varchar('image', { length: 255 }).default(''),
    link: varchar('link', { length: 255 }).default(''),
    publishedAt: timestamp('published_at'),
    expiresAt: timestamp('expires_at'),
    isPublished: boolean('is_published').default(false),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    departmentId: uuid('department_id').references(() => departments.id),
    locationId: uuid('location_id').references(() => companyLocations.id),
    categoryId: uuid('category_id')
      .references(() => announcementCategories.id)
      .notNull(),
    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [
    index('announcements_company_id_idx').on(t.companyId),
    index('announcements_category_id_idx').on(t.categoryId),
    index('announcements_department_id_idx').on(t.departmentId),
    index('announcements_location_id_idx').on(t.locationId),
    index('announcements_published_at_idx').on(t.publishedAt),
    index('announcements_is_published_idx').on(t.isPublished),
    index('announcements_created_by_idx').on(t.createdBy),
  ],
);

export const announcementComments = pgTable(
  'announcement_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    announcementId: uuid('announcement_id')
      .references(() => announcements.id, { onDelete: 'cascade' })
      .notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('announcement_comments_announcement_id_idx').on(t.announcementId),
    index('announcement_comments_created_by_idx').on(t.createdBy),
    index('announcement_comments_created_at_idx').on(t.createdAt),
  ],
);

export const announcementReactions = pgTable(
  'announcement_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    announcementId: uuid('announcement_id')
      .references(() => announcements.id, { onDelete: 'cascade' })
      .notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    reactionType: varchar('reaction_type', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('announcement_reactions_announcement_id_idx').on(t.announcementId),
    index('announcement_reactions_created_by_idx').on(t.createdBy),
    index('announcement_reactions_reaction_type_idx').on(t.reactionType),
  ],
);

export const commentReactions = pgTable(
  'comment_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .references(() => announcementComments.id, { onDelete: 'cascade' })
      .notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    reactionType: varchar('reaction_type', { length: 20 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('comment_reactions_comment_id_idx').on(t.commentId),
    index('comment_reactions_created_by_idx').on(t.createdBy),
    index('comment_reactions_reaction_type_idx').on(t.reactionType),
  ],
);
