"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const audit_service_1 = require("../audit/audit.service");
const announcements_schema_1 = require("./schema/announcements.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../auth/schema");
const cache_service_1 = require("../../common/cache/cache.service");
const reaction_types_1 = require("./types/reaction-types");
const announcement_cache_service_1 = require("../../common/cache/announcement-cache.service");
let CommentService = class CommentService {
    constructor(db, auditService, cache, announcementCache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.announcementCache = announcementCache;
    }
    commentsKey(announcementId) {
        return `announcement:${announcementId}:comments`;
    }
    reactionCountsKey(announcementId) {
        return `announcement:${announcementId}:comment-reaction-counts`;
    }
    async invalidateAnnouncementCaches(announcementId) {
        await Promise.allSettled([
            this.cache.del(this.commentsKey(announcementId)),
            this.cache.del(this.reactionCountsKey(announcementId)),
        ]);
    }
    async createComment(dto, announcementId, user) {
        const [announcement] = await this.db
            .select({ id: announcements_schema_1.announcements.id })
            .from(announcements_schema_1.announcements)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, announcementId))
            .limit(1)
            .execute();
        if (!announcement) {
            throw new common_1.BadRequestException('Announcement not found');
        }
        const [newComment] = await this.db
            .insert(announcements_schema_1.announcementComments)
            .values({
            comment: dto.comment,
            createdBy: user.id,
            createdAt: new Date(),
            announcementId,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'announcement_comment',
            entityId: newComment.id,
            userId: user.id,
            details: `Created comment on announcement with ID: ${announcementId}`,
            changes: {
                comment: newComment.comment,
                createdBy: user.id,
                createdAt: newComment.createdAt,
            },
        });
        await this.invalidateAnnouncementCaches(announcementId);
        return newComment;
    }
    async getComments(announcementId, userId) {
        const comments = await this.cache.getOrSetCache(this.commentsKey(announcementId), async () => {
            return this.db
                .select({
                id: announcements_schema_1.announcementComments.id,
                comment: announcements_schema_1.announcementComments.comment,
                createdAt: announcements_schema_1.announcementComments.createdAt,
                createdBy: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`.as('createdBy'),
                avatarUrl: schema_1.users.avatar,
            })
                .from(announcements_schema_1.announcementComments)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.createdBy, schema_1.users.id))
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.announcementId, announcementId))
                .orderBy((0, drizzle_orm_1.desc)(announcements_schema_1.announcementComments.createdAt))
                .execute();
        });
        if (comments.length === 0)
            return [];
        const commentIds = comments.map((c) => c.id);
        const counts = await this.cache.getOrSetCache(this.reactionCountsKey(announcementId), async () => {
            const rows = await this.db
                .select({
                commentId: announcements_schema_1.commentReactions.commentId,
                reactionType: announcements_schema_1.commentReactions.reactionType,
                count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
            })
                .from(announcements_schema_1.commentReactions)
                .where((0, drizzle_orm_1.inArray)(announcements_schema_1.commentReactions.commentId, commentIds))
                .groupBy(announcements_schema_1.commentReactions.commentId, announcements_schema_1.commentReactions.reactionType)
                .execute();
            const map = {};
            for (const rc of rows) {
                if (!map[rc.commentId])
                    map[rc.commentId] = [];
                map[rc.commentId].push({
                    reactionType: rc.reactionType,
                    count: rc.count,
                });
            }
            return map;
        });
        const userReactions = await this.db
            .select({
            commentId: announcements_schema_1.commentReactions.commentId,
            reactionType: announcements_schema_1.commentReactions.reactionType,
        })
            .from(announcements_schema_1.commentReactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(announcements_schema_1.commentReactions.commentId, commentIds), (0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.createdBy, userId)))
            .execute();
        const userReactionMap = new Map();
        for (const ur of userReactions) {
            if (!userReactionMap.has(ur.commentId))
                userReactionMap.set(ur.commentId, []);
            userReactionMap.get(ur.commentId).push(ur.reactionType);
        }
        return comments.map((c) => ({
            ...c,
            reactions: counts[c.id] || [],
            userReactions: userReactionMap.get(c.id) || [],
        }));
    }
    async deleteComment(commentId, user) {
        const [comment] = await this.db
            .select({
            id: announcements_schema_1.announcementComments.id,
            announcementId: announcements_schema_1.announcementComments.announcementId,
        })
            .from(announcements_schema_1.announcementComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.id, commentId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.createdBy, user.id)))
            .limit(1)
            .execute();
        if (!comment)
            throw new common_1.BadRequestException('Comment not found');
        await this.db
            .delete(announcements_schema_1.announcementComments)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.id, commentId))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'announcement_comment',
            entityId: commentId,
            userId: user.id,
            details: `Deleted comment with ID: ${commentId}`,
        });
        await this.invalidateAnnouncementCaches(comment.announcementId);
        return { message: 'Comment deleted successfully' };
    }
    async toggleCommentReaction(commentId, user, reactionType) {
        const { id: userId, companyId } = user;
        if (!reaction_types_1.REACTION_TYPES.includes(reactionType)) {
            throw new common_1.BadRequestException('Invalid reaction type');
        }
        const [comment] = await this.db
            .select({
            id: announcements_schema_1.announcementComments.id,
            announcementId: announcements_schema_1.announcementComments.announcementId,
        })
            .from(announcements_schema_1.announcementComments)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.id, commentId))
            .limit(1)
            .execute();
        if (!comment)
            throw new common_1.BadRequestException('Comment not found');
        const reacted = await this.db.transaction(async (tx) => {
            const [existing] = await tx
                .select({ id: announcements_schema_1.commentReactions.id })
                .from(announcements_schema_1.commentReactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.commentId, commentId), (0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.createdBy, userId), (0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.reactionType, reactionType)))
                .limit(1)
                .execute();
            if (existing) {
                await tx
                    .delete(announcements_schema_1.commentReactions)
                    .where((0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.id, existing.id))
                    .execute();
                await this.auditService.logAction({
                    action: 'comment_reaction_removed',
                    entity: 'announcement_comment',
                    entityId: commentId,
                    userId,
                    details: `Removed ${reactionType} on comment ${commentId}`,
                    changes: { id: existing.id, reactionType },
                });
                return false;
            }
            await tx
                .insert(announcements_schema_1.commentReactions)
                .values({
                commentId,
                createdBy: userId,
                reactionType,
                createdAt: new Date(),
            })
                .execute();
            await this.auditService.logAction({
                action: 'comment_reaction_added',
                entity: 'announcement_comment',
                entityId: commentId,
                userId,
                details: `Added ${reactionType} on comment ${commentId}`,
            });
            return true;
        });
        await Promise.allSettled([
            this.cache.del(this.commentsKey(comment.announcementId)),
            this.cache.del(this.reactionCountsKey(comment.announcementId)),
        ]);
        await Promise.allSettled([
            this.announcementCache.invalidateLists(companyId),
        ]);
        return { reacted };
    }
};
exports.CommentService = CommentService;
exports.CommentService = CommentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        announcement_cache_service_1.AnnouncementCacheService])
], CommentService);
//# sourceMappingURL=comment.service.js.map