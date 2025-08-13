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
exports.GoalActivityService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const performance_goals_schema_1 = require("./schema/performance-goals.schema");
const performance_goal_updates_schema_1 = require("./schema/performance-goal-updates.schema");
const goal_comments_schema_1 = require("./schema/goal-comments.schema");
const goal_attachments_schema_1 = require("./schema/goal-attachments.schema");
const schema_1 = require("../../../drizzle/schema");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let GoalActivityService = class GoalActivityService {
    constructor(db, auditService, s3Service, cache) {
        this.db = db;
        this.auditService = auditService;
        this.s3Service = s3Service;
        this.cache = cache;
    }
    async invalidateGoals(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async addProgressUpdate(goalId, dto, user) {
        const { id: userId, companyId } = user;
        const { progress, note } = dto;
        if (progress < 0 || progress > 100) {
            throw new common_1.BadRequestException('Progress must be between 0 and 100');
        }
        const [goal] = await this.db
            .select()
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false)))
            .execute();
        if (!goal) {
            throw new common_1.BadRequestException('Goal not found');
        }
        const [latestUpdate] = await this.db
            .select()
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, goalId))
            .orderBy((0, drizzle_orm_1.desc)(performance_goal_updates_schema_1.performanceGoalUpdates.createdAt))
            .limit(1)
            .execute();
        const lastProgress = latestUpdate?.progress ?? 0;
        if (lastProgress >= 100) {
            throw new common_1.BadRequestException('Goal has already been completed');
        }
        if (progress < lastProgress) {
            throw new common_1.BadRequestException(`Cannot set progress to a lower value (${progress} < ${lastProgress})`);
        }
        if (progress === lastProgress) {
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
            .returning()
            .execute();
        await this.invalidateGoals(companyId);
        return update;
    }
    async updateNote(goalId, note, user) {
        const { id: userId, companyId } = user;
        const [goalUpdate] = await this.db
            .select()
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.id, goalId))
            .execute();
        if (!goalUpdate) {
            throw new common_1.BadRequestException('Goal not found');
        }
        if (goalUpdate.createdBy !== userId) {
            throw new common_1.BadRequestException('You do not have permission to update this goal');
        }
        const [updatedGoal] = await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({ note, updatedAt: new Date(), updatedBy: userId })
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_goal',
            entityId: goalId,
            userId,
            details: `Updated note for goal ${goalId}`,
            changes: { note },
        });
        await this.invalidateGoals(companyId);
        return updatedGoal;
    }
    async addComment(goalId, user, dto) {
        const { id: userId, companyId } = user;
        const [goal] = await this.db
            .select()
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false)))
            .execute();
        if (!goal) {
            throw new common_1.BadRequestException('Goal not found');
        }
        await this.db
            .insert(goal_comments_schema_1.goalComments)
            .values({ ...dto, authorId: userId, goalId })
            .execute();
        await this.invalidateGoals(companyId);
        return { message: 'Comment added successfully' };
    }
    async updateComment(commentId, user, content) {
        const { id: userId, companyId } = user;
        const [comment] = await this.db
            .select()
            .from(goal_comments_schema_1.goalComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.authorId, userId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.isPrivate, false)))
            .execute();
        if (!comment) {
            throw new common_1.BadRequestException('Comment not found or inaccessible');
        }
        const [updatedComment] = await this.db
            .update(goal_comments_schema_1.goalComments)
            .set({ comment: content, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'goal_comment',
            entityId: commentId,
            userId,
            details: `Updated comment on goal ${comment.goalId} by user ${userId}`,
            changes: { content },
        });
        await this.invalidateGoals(companyId);
        return updatedComment;
    }
    async deleteComment(commentId, user) {
        const { id: userId, companyId } = user;
        const [comment] = await this.db
            .select()
            .from(goal_comments_schema_1.goalComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.authorId, userId), (0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.isPrivate, false)))
            .execute();
        if (!comment) {
            throw new common_1.BadRequestException('Comment not found or inaccessible');
        }
        await this.db
            .delete(goal_comments_schema_1.goalComments)
            .where((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.id, commentId))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'goal_comment',
            entityId: commentId,
            userId: user.id,
            details: `Deleted comment on goal ${comment.goalId} by user ${userId}`,
        });
        await this.invalidateGoals(companyId);
        return { message: 'Comment deleted successfully' };
    }
    async uploadGoalAttachment(goalId, dto, user) {
        const { id: userId, companyId } = user;
        const { file, comment } = dto;
        const folderName = 'Goal Attachments';
        const folder = await this.getOrCreateGoalFolder(companyId, folderName);
        const [meta, base64Data] = file.base64.split(',');
        const mimeMatch = meta.match(/data:(.*);base64/);
        const mimeType = mimeMatch?.[1];
        if (!mimeType || !base64Data) {
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
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'upload',
            entity: 'goal_attachment',
            entityId: attachment.id,
            userId,
            details: `Uploaded attachment for goal ${goalId}`,
            changes: { fileName: file.name, url },
        });
        await this.invalidateGoals(companyId);
        return attachment;
    }
    async updateAttachment(attachmentId, user, dto) {
        const { id: userId, companyId } = user;
        const { file, comment } = dto;
        const [attachment] = await this.db
            .select()
            .from(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId))
            .execute();
        if (!attachment) {
            throw new common_1.BadRequestException('Attachment not found');
        }
        if (attachment.uploadedById !== userId) {
            throw new common_1.BadRequestException('You do not have permission to update this attachment');
        }
        if (file) {
            const [meta, base64Data] = file.base64.split(',');
            const mimeMatch = meta.match(/data:(.*);base64/);
            const mimeType = mimeMatch?.[1];
            if (!mimeType || !base64Data) {
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
                .returning()
                .execute();
            await this.invalidateGoals(companyId);
            return updatedAttachment;
        }
        else {
            const [updatedAttachment] = await this.db
                .update(goal_attachments_schema_1.goalAttachments)
                .set({
                comment,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId))
                .returning()
                .execute();
            await this.invalidateGoals(companyId);
            return updatedAttachment;
        }
    }
    async deleteAttachment(attachmentId, user) {
        const { companyId } = user;
        const [attachment] = await this.db
            .select()
            .from(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId))
            .execute();
        if (!attachment) {
            throw new common_1.BadRequestException('Attachment not found');
        }
        if (attachment.uploadedById !== user.id) {
            throw new common_1.BadRequestException('You do not have permission to delete this attachment');
        }
        await this.s3Service.deleteFileFromS3(attachment.fileUrl);
        await this.db
            .delete(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.id, attachmentId))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'goal_attachment',
            entityId: attachmentId,
            userId: user.id,
            details: `Deleted attachment for goal ${attachment.goalId} by user ${user.id}`,
        });
        await this.invalidateGoals(companyId);
    }
    async getOrCreateGoalFolder(companyId, name) {
        let [folder] = await this.db
            .select()
            .from(schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyFileFolders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyFileFolders.name, name)))
            .execute();
        if (!folder) {
            [folder] = await this.db
                .insert(schema_1.companyFileFolders)
                .values({ companyId, name, createdAt: new Date() })
                .returning()
                .execute();
        }
        return folder;
    }
};
exports.GoalActivityService = GoalActivityService;
exports.GoalActivityService = GoalActivityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        s3_storage_service_1.S3StorageService,
        cache_service_1.CacheService])
], GoalActivityService);
//# sourceMappingURL=goal-activity.service.js.map