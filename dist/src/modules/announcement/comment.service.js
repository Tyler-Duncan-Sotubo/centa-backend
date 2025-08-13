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
let CommentService = class CommentService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async createComment(dto, announcementId, user) {
        const [announcement] = await this.db
            .select()
            .from(announcements_schema_1.announcements)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, announcementId))
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
            announcementId: announcementId,
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
        return newComment;
    }
    async getComments(announcementId, userId) {
        const comments = await this.db
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
        const commentIds = comments.map((c) => c.id);
        if (commentIds.length === 0)
            return [];
        const reactionCounts = await this.db
            .select({
            commentId: announcements_schema_1.commentReactions.commentId,
            reactionType: announcements_schema_1.commentReactions.reactionType,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
        })
            .from(announcements_schema_1.commentReactions)
            .where((0, drizzle_orm_1.inArray)(announcements_schema_1.commentReactions.commentId, commentIds))
            .groupBy(announcements_schema_1.commentReactions.commentId, announcements_schema_1.commentReactions.reactionType)
            .execute();
        const userReactions = await this.db
            .select({
            commentId: announcements_schema_1.commentReactions.commentId,
            reactionType: announcements_schema_1.commentReactions.reactionType,
        })
            .from(announcements_schema_1.commentReactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(announcements_schema_1.commentReactions.commentId, commentIds), (0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.createdBy, userId)))
            .execute();
        const userReactionMap = new Map();
        userReactions.forEach((ur) => {
            if (!userReactionMap.has(ur.commentId)) {
                userReactionMap.set(ur.commentId, []);
            }
            userReactionMap.get(ur.commentId).push(ur.reactionType);
        });
        const reactionCountMap = new Map();
        reactionCounts.forEach((rc) => {
            if (!reactionCountMap.has(rc.commentId)) {
                reactionCountMap.set(rc.commentId, []);
            }
            reactionCountMap.get(rc.commentId).push({
                reactionType: rc.reactionType,
                count: rc.count,
            });
        });
        return comments.map((comment) => ({
            ...comment,
            reactions: reactionCountMap.get(comment.id) || [],
            userReactions: userReactionMap.get(comment.id) || [],
        }));
    }
    async deleteComment(commentId, user) {
        const [comment] = await this.db
            .select()
            .from(announcements_schema_1.announcementComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.id, commentId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementComments.createdBy, user.id)))
            .execute();
        if (!comment) {
            throw new common_1.BadRequestException('Comment not found');
        }
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
        return { message: 'Comment deleted successfully' };
    }
    async toggleCommentReaction(commentId, userId, reactionType) {
        const validReactions = [
            'like',
            'love',
            'celebrate',
            'sad',
            'angry',
            'clap',
            'happy',
        ];
        if (!validReactions.includes(reactionType)) {
            throw new common_1.BadRequestException('Invalid reaction type');
        }
        const [existingReaction] = await this.db
            .select()
            .from(announcements_schema_1.commentReactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.commentId, commentId), (0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.createdBy, userId), (0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.reactionType, reactionType)))
            .execute();
        if (existingReaction) {
            await this.db
                .delete(announcements_schema_1.commentReactions)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.commentReactions.id, existingReaction.id))
                .execute();
            return { reacted: false };
        }
        else {
            await this.db
                .insert(announcements_schema_1.commentReactions)
                .values({
                commentId,
                createdBy: userId,
                reactionType,
                createdAt: new Date(),
            })
                .execute();
            return { reacted: true };
        }
    }
};
exports.CommentService = CommentService;
exports.CommentService = CommentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], CommentService);
//# sourceMappingURL=comment.service.js.map