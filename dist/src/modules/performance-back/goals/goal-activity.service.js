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
var GoalActivityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalActivityService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const performance_goals_schema_1 = require("./schema/performance-goals.schema");
const performance_goal_updates_schema_1 = require("./schema/performance-goal-updates.schema");
const goal_comments_schema_1 = require("./schema/goal-comments.schema");
const goal_attachments_schema_1 = require("./schema/goal-attachments.schema");
const schema_1 = require("../../../drizzle/schema");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let GoalActivityService = GoalActivityService_1 = class GoalActivityService {
    constructor(db, auditService, s3Service, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.s3Service = s3Service;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(GoalActivityService_1.name);
    }
    goalKey(companyId, goalId) {
        return `goal:${companyId}:${goalId}`;
    }
    async burst(opts) {
        const key = this.goalKey(opts.companyId, opts.goalId);
        await this.cache.del(key);
        this.logger.debug({ key }, 'goal:cache:burst');
    }
    async getGoalCached(companyId, goalId) {
        const key = this.goalKey(companyId, goalId);
        this.logger.debug({ key }, 'goal:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [goal] = await this.db
                .select()
                .from(performance_goals_schema_1.performanceGoals)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId)));
            if (!goal)
                this.logger.warn({ companyId, goalId }, 'goal:not-found');
            return goal ?? null;
        });
    }
    async addProgressUpdate(goalId, dto, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, goalId, dto }, 'goal:addProgress:start');
        const { progress, note } = dto;
        if (progress < 0 || progress > 100) {
            this.logger.warn({ progress }, 'goal:addProgress:bad-progress');
            throw new common_1.BadRequestException('Progress must be between 0 and 100');
        }
        const goal = await this.getGoalCached(companyId, goalId);
        if (!goal || goal.isArchived) {
            this.logger.warn({ goalId }, 'goal:addProgress:not-found-or-archived');
            throw new common_1.BadRequestException('Goal not found');
        }
        const [latestUpdate] = await this.db
            .select()
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, goalId))
            .orderBy((0, drizzle_orm_1.desc)(performance_goal_updates_schema_1.performanceGoalUpdates.createdAt))
            .limit(1);
        const lastProgress = latestUpdate?.progress ?? 0;
        if (lastProgress >= 100) {
            this.logger.warn({ goalId }, 'goal:addProgress:already-complete');
            throw new common_1.BadRequestException('Goal has already been completed');
        }
        if (progress < lastProgress) {
            this.logger.warn({ progress, lastProgress }, 'goal:addProgress:downgrade');
            throw new common_1.BadRequestException(`Cannot set progress to a lower value (${progress} < ${lastProgress})`);
        }
        if (progress === lastProgress) {
            this.logger.warn({ progress }, 'goal:addProgress:duplicate-value');
            throw new common_1.BadRequestException('This progress value has already been recorded');
        }
        const [update] = await this.db
            .insert(performance_goal_updates_schema_1.performanceGoalUpdates)
            .values({
            goalId,
            progress,
            note,
            createdAt: new Date(),
            createdBy: userId,
        })
            .returning();
        await this.burst({ companyId, goalId });
        this.logger.info({ goalId, updateId: update.id }, 'goal:addProgress:done');
        return update;
    }
    async updateNote(goalId, note, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, goalId }, 'goal:updateNote:start');
        const [goalUpdate] = await this.db
            .select()
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.id, goalId));
        if (!goalUpdate) {
            this.logger.warn({ goalId }, 'goal:updateNote:not-found');
            throw new common_1.BadRequestException('Goal not found');
        }
        if (goalUpdate.createdBy !== userId) {
            this.logger.warn({ goalId, userId }, 'goal:updateNote:not-owner');
            throw new common_1.BadRequestException('You do not have permission to update this goal');
        }
        const [updatedGoal] = await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({ updatedAt: new Date(), updatedBy: userId, note })
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_goal',
            entityId: goalId,
            userId,
            details: `Updated note for goal ${goalId}`,
            changes: { note },
        });
        await this.burst({ companyId, goalId });
        this.logger.info({ goalId }, 'goal:updateNote:done');
        return updatedGoal;
    }
    async addComment(goalId, user, dto) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, goalId }, 'goal:addComment:start');
        const goal = await this.getGoalCached(companyId, goalId);
        if (!goal || goal.isArchived) {
            this.logger.warn({ goalId }, 'goal:addComment:not-found-or-archived');
            throw new common_1.BadRequestException('Goal not found');
        }
        await this.db
            .insert(goal_comments_schema_1.goalComments)
            .values({ ...dto, authorId: userId, goalId });
        await this.burst({ companyId, goalId });
        this.logger.info({ goalId }, 'goal:addComment:done');
        return { message: 'Comment added successfully' };
    }
    async updateComment(commentId, user, content) {
        const { id: userId } = user;
        this.logger.info({ commentId, userId }, 'goal:updateComment:start');
        const [comment] = await this.db
            .select()
            .from(goal_comments_schema_1.goalComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.authorId, userId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.isPrivate, false)));
        if (!comment) {
            this.logger.warn({ commentId }, 'goal:updateComment:not-found-or-denied');
            throw new common_1.BadRequestException('Comment not found or inaccessible');
        }
        const [updatedComment] = await this.db
            .update(goal_comments_schema_1.goalComments)
            .set({ comment: content, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'goal_comment',
            entityId: commentId,
            userId,
            details: `Updated comment on goal ${comment.goalId} by user ${userId}`,
            changes: { content },
        });
        this.logger.info({ commentId }, 'goal:updateComment:done');
        return updatedComment;
    }
    async deleteComment(commentId, user) {
        const { id: userId } = user;
        this.logger.info({ commentId, userId }, 'goal:deleteComment:start');
        const [comment] = await this.db
            .select()
            .from(goal_comments_schema_1.goalComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.authorId, userId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.isPrivate, false)));
        if (!comment) {
            this.logger.warn({ commentId }, 'goal:deleteComment:not-found-or-denied');
            throw new common_1.BadRequestException('Comment not found or inaccessible');
        }
        await this.db.delete(goal_comments_schema_1.goalComments).where((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'goal_comment',
            entityId: commentId,
            userId,
            details: `Deleted comment on goal ${comment.goalId} by user ${userId}`,
        });
        this.logger.info({ commentId }, 'goal:deleteComment:done');
        return { message: 'Comment deleted successfully' };
    }
    async uploadGoalAttachment(goalId, dto, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, goalId }, 'goal:uploadAttachment:start');
        const folder = await this.getOrCreateGoalFolder(companyId, 'Goal Attachments');
        const { file, comment } = dto;
        const [meta, base64Data] = file.base64.split(',');
        const mimeMatch = meta.match(/data:(.*);base64/);
        const mimeType = mimeMatch?.[1];
        if (!mimeType || !base64Data) {
            this.logger.warn({ goalId }, 'goal:uploadAttachment:bad-file');
            throw new common_1.BadRequestException('Invalid file format');
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `company-files/${companyId}/${folder.id}/${Date.now()}-${file.name}`;
        const { url } = await this.s3Service.uploadBuffer(buffer, key, companyId, 'goal_attachment', 'attachment', mimeType);
        const [attachment] = await this.db
            .insert(goal_attachments_schema_1.goalAttachments)
            .values({
            goalId,
            uploadedById: userId,
            fileUrl: url,
            fileName: file.name,
            comment,
            createdAt: new Date(),
        })
            .returning();
        await this.auditService.logAction({
            action: 'upload',
            entity: 'goal_attachment',
            entityId: attachment.id,
            userId,
            details: `Uploaded attachment for goal ${goalId}`,
            changes: { fileName: file.name, url },
        });
        await this.burst({ companyId, goalId });
        this.logger.info({ goalId, attachmentId: attachment.id }, 'goal:uploadAttachment:done');
        return attachment;
    }
    async updateAttachment(attachmentId, user, dto) {
        const { id: userId, companyId } = user;
        this.logger.info({ attachmentId, userId }, 'goal:updateAttachment:start');
        const [attachment] = await this.db
            .select()
            .from(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId));
        if (!attachment) {
            this.logger.warn({ attachmentId }, 'goal:updateAttachment:not-found');
            throw new common_1.BadRequestException('Attachment not found');
        }
        if (attachment.uploadedById !== userId) {
            this.logger.warn({ attachmentId, userId }, 'goal:updateAttachment:not-owner');
            throw new common_1.BadRequestException('You do not have permission to update this attachment');
        }
        const { file, comment } = dto;
        if (file) {
            const [meta, base64Data] = file.base64.split(',');
            const mimeMatch = meta.match(/data:(.*);base64/);
            const mimeType = mimeMatch?.[1];
            if (!mimeType || !base64Data) {
                this.logger.warn({ attachmentId }, 'goal:updateAttachment:bad-file');
                throw new common_1.BadRequestException('Invalid file format');
            }
            const buffer = Buffer.from(base64Data, 'base64');
            const key = `company-files/${companyId}/Goal Attachments/${Date.now()}-${file.name}`;
            const { url } = await this.s3Service.uploadBuffer(buffer, key, companyId, 'goal_attachment', 'attachment', mimeType);
            const [updatedAttachment] = await this.db
                .update(goal_attachments_schema_1.goalAttachments)
                .set({
                fileUrl: url,
                fileName: file.name,
                comment,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId))
                .returning();
            await this.burst({ companyId, goalId: updatedAttachment.goalId });
            this.logger.info({ attachmentId }, 'goal:updateAttachment:done');
            return updatedAttachment;
        }
        else {
            const [updatedAttachment] = await this.db
                .update(goal_attachments_schema_1.goalAttachments)
                .set({ comment, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId))
                .returning();
            await this.burst({ companyId, goalId: updatedAttachment.goalId });
            this.logger.info({ attachmentId }, 'goal:updateAttachment:done');
            return updatedAttachment;
        }
    }
    async deleteAttachment(attachmentId, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ attachmentId, userId }, 'goal:deleteAttachment:start');
        const [attachment] = await this.db
            .select()
            .from(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId));
        if (!attachment) {
            this.logger.warn({ attachmentId }, 'goal:deleteAttachment:not-found');
            throw new common_1.BadRequestException('Attachment not found');
        }
        if (attachment.uploadedById !== user.id) {
            this.logger.warn({ attachmentId, userId }, 'goal:deleteAttachment:not-owner');
            throw new common_1.BadRequestException('You do not have permission to delete this attachment');
        }
        await this.s3Service.deleteFileFromS3(attachment.fileUrl);
        await this.db
            .delete(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'goal_attachment',
            entityId: attachmentId,
            userId: user.id,
            details: `Deleted attachment for goal ${attachment.goalId} by user ${user.id}`,
        });
        await this.burst({ companyId, goalId: attachment.goalId });
        this.logger.info({ attachmentId }, 'goal:deleteAttachment:done');
    }
    async getOrCreateGoalFolder(companyId, name) {
        let [folder] = await this.db
            .select()
            .from(schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyFileFolders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyFileFolders.name, name)));
        if (!folder) {
            [folder] = await this.db
                .insert(schema_1.companyFileFolders)
                .values({ companyId, name, createdAt: new Date() })
                .returning();
        }
        return folder;
    }
};
exports.GoalActivityService = GoalActivityService;
exports.GoalActivityService = GoalActivityService = GoalActivityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        s3_storage_service_1.S3StorageService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], GoalActivityService);
//# sourceMappingURL=goal-activity.service.js.map