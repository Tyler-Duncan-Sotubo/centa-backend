"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentReactions = exports.announcementReactions = exports.announcementComments = exports.announcements = exports.announcementCategories = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.announcementCategories = (0, pg_core_1.pgTable)('announcement_categories', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id)
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('announcement_categories_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('announcement_categories_id_idx').on(t.id),
]);
exports.announcements = (0, pg_core_1.pgTable)('announcements', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    image: (0, pg_core_1.varchar)('image', { length: 255 }).default(''),
    link: (0, pg_core_1.varchar)('link', { length: 255 }).default(''),
    publishedAt: (0, pg_core_1.timestamp)('published_at'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    isPublished: (0, pg_core_1.boolean)('is_published').default(false),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    departmentId: (0, pg_core_1.uuid)('department_id').references(() => schema_1.departments.id),
    locationId: (0, pg_core_1.uuid)('location_id').references(() => schema_1.companyLocations.id),
    categoryId: (0, pg_core_1.uuid)('category_id')
        .references(() => exports.announcementCategories.id)
        .notNull(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id, { onDelete: 'cascade' })
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('announcements_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('announcements_category_id_idx').on(t.categoryId),
    (0, pg_core_1.index)('announcements_department_id_idx').on(t.departmentId),
    (0, pg_core_1.index)('announcements_location_id_idx').on(t.locationId),
    (0, pg_core_1.index)('announcements_published_at_idx').on(t.publishedAt),
    (0, pg_core_1.index)('announcements_is_published_idx').on(t.isPublished),
    (0, pg_core_1.index)('announcements_created_by_idx').on(t.createdBy),
]);
exports.announcementComments = (0, pg_core_1.pgTable)('announcement_comments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    announcementId: (0, pg_core_1.uuid)('announcement_id')
        .references(() => exports.announcements.id, { onDelete: 'cascade' })
        .notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .references(() => schema_1.users.id)
        .notNull(),
    comment: (0, pg_core_1.text)('comment').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('announcement_comments_announcement_id_idx').on(t.announcementId),
    (0, pg_core_1.index)('announcement_comments_created_by_idx').on(t.createdBy),
    (0, pg_core_1.index)('announcement_comments_created_at_idx').on(t.createdAt),
]);
exports.announcementReactions = (0, pg_core_1.pgTable)('announcement_reactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    announcementId: (0, pg_core_1.uuid)('announcement_id')
        .references(() => exports.announcements.id, { onDelete: 'cascade' })
        .notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .references(() => schema_1.users.id)
        .notNull(),
    reactionType: (0, pg_core_1.varchar)('reaction_type', { length: 20 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('announcement_reactions_announcement_id_idx').on(t.announcementId),
    (0, pg_core_1.index)('announcement_reactions_created_by_idx').on(t.createdBy),
    (0, pg_core_1.index)('announcement_reactions_reaction_type_idx').on(t.reactionType),
]);
exports.commentReactions = (0, pg_core_1.pgTable)('comment_reactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    commentId: (0, pg_core_1.uuid)('comment_id')
        .references(() => exports.announcementComments.id, { onDelete: 'cascade' })
        .notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .references(() => schema_1.users.id)
        .notNull(),
    reactionType: (0, pg_core_1.varchar)('reaction_type', { length: 20 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('comment_reactions_comment_id_idx').on(t.commentId),
    (0, pg_core_1.index)('comment_reactions_created_by_idx').on(t.createdBy),
    (0, pg_core_1.index)('comment_reactions_reaction_type_idx').on(t.reactionType),
]);
//# sourceMappingURL=announcements.schema.js.map