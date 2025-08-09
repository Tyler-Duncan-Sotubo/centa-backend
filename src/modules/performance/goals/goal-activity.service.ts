import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and, desc } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { performanceGoals } from './schema/performance-goals.schema';
import { performanceGoalUpdates } from './schema/performance-goal-updates.schema';
import { AddGoalProgressDto } from './dto/add-goal-progress.dto';
import { AddGoalCommentDto } from './dto/add-goal-comment.dto';
import { goalComments } from './schema/goal-comments.schema';
import { goalAttachments } from './schema/goal-attachments.schema';
import { companyFileFolders } from 'src/drizzle/schema';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { UploadGoalAttachmentDto } from './dto/upload-goal-attachment.dto';
import { UpdateGoalAttachmentDto } from './dto/update-goal-attachment.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class GoalActivityService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly s3Service: S3StorageService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(GoalActivityService.name);
  }

  // ---------- cache keys ----------
  private goalKey(companyId: string, goalId: string) {
    return `goal:${companyId}:${goalId}`;
  }

  private async burst(opts: { companyId: string; goalId: string }) {
    const key = this.goalKey(opts.companyId, opts.goalId);
    await this.cache.del(key);
    this.logger.debug({ key }, 'goal:cache:burst');
  }

  private async getGoalCached(companyId: string, goalId: string) {
    const key = this.goalKey(companyId, goalId);
    this.logger.debug({ key }, 'goal:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [goal] = await this.db
        .select()
        .from(performanceGoals)
        .where(
          and(
            eq(performanceGoals.id, goalId),
            eq(performanceGoals.companyId, companyId),
          ),
        );
      if (!goal) this.logger.warn({ companyId, goalId }, 'goal:not-found');
      return goal ?? null;
    });
  }

  async addProgressUpdate(goalId: string, dto: AddGoalProgressDto, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, goalId, dto }, 'goal:addProgress:start');

    const { progress, note } = dto;
    if (progress < 0 || progress > 100) {
      this.logger.warn({ progress }, 'goal:addProgress:bad-progress');
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    const goal = await this.getGoalCached(companyId, goalId);
    if (!goal || goal.isArchived) {
      this.logger.warn({ goalId }, 'goal:addProgress:not-found-or-archived');
      throw new BadRequestException('Goal not found');
    }

    const [latestUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, goalId))
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1);

    const lastProgress = latestUpdate?.progress ?? 0;

    if (lastProgress >= 100) {
      this.logger.warn({ goalId }, 'goal:addProgress:already-complete');
      throw new BadRequestException('Goal has already been completed');
    }
    if (progress < lastProgress) {
      this.logger.warn(
        { progress, lastProgress },
        'goal:addProgress:downgrade',
      );
      throw new BadRequestException(
        `Cannot set progress to a lower value (${progress} < ${lastProgress})`,
      );
    }
    if (progress === lastProgress) {
      this.logger.warn({ progress }, 'goal:addProgress:duplicate-value');
      throw new BadRequestException(
        'This progress value has already been recorded',
      );
    }

    const [update] = await this.db
      .insert(performanceGoalUpdates)
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

  async updateNote(goalId: string, note: string, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, goalId }, 'goal:updateNote:start');

    const [goalUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.id, goalId));

    if (!goalUpdate) {
      this.logger.warn({ goalId }, 'goal:updateNote:not-found');
      throw new BadRequestException('Goal not found');
    }
    if (goalUpdate.createdBy !== userId) {
      this.logger.warn({ goalId, userId }, 'goal:updateNote:not-owner');
      throw new BadRequestException(
        'You do not have permission to update this goal',
      );
    }

    const [updatedGoal] = await this.db
      .update(performanceGoals)
      .set({ updatedAt: new Date(), updatedBy: userId, note })
      .where(eq(performanceGoals.id, goalId))
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

  async addComment(goalId: string, user: User, dto: AddGoalCommentDto) {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, goalId }, 'goal:addComment:start');

    const goal = await this.getGoalCached(companyId, goalId);
    if (!goal || goal.isArchived) {
      this.logger.warn({ goalId }, 'goal:addComment:not-found-or-archived');
      throw new BadRequestException('Goal not found');
    }

    await this.db
      .insert(goalComments)
      .values({ ...dto, authorId: userId, goalId });

    await this.burst({ companyId, goalId });
    this.logger.info({ goalId }, 'goal:addComment:done');
    return { message: 'Comment added successfully' };
  }

  async updateComment(commentId: string, user: User, content: string) {
    const { id: userId } = user;
    this.logger.info({ commentId, userId }, 'goal:updateComment:start');

    const [comment] = await this.db
      .select()
      .from(goalComments)
      .where(
        and(
          eq(goalComments.id, commentId),
          eq(goalComments.authorId, userId),
          eq(goalComments.isPrivate, false),
        ),
      );

    if (!comment) {
      this.logger.warn({ commentId }, 'goal:updateComment:not-found-or-denied');
      throw new BadRequestException('Comment not found or inaccessible');
    }

    const [updatedComment] = await this.db
      .update(goalComments)
      .set({ comment: content, updatedAt: new Date() })
      .where(eq(goalComments.id, commentId))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'goal_comment',
      entityId: commentId,
      userId,
      details: `Updated comment on goal ${comment.goalId} by user ${userId}`,
      changes: { content },
    });

    // We don’t know companyId here; no burst (comment reads aren’t cached).
    this.logger.info({ commentId }, 'goal:updateComment:done');
    return updatedComment;
  }

  async deleteComment(commentId: string, user: User) {
    const { id: userId } = user;
    this.logger.info({ commentId, userId }, 'goal:deleteComment:start');

    const [comment] = await this.db
      .select()
      .from(goalComments)
      .where(
        and(
          eq(goalComments.id, commentId),
          eq(goalComments.authorId, userId),
          eq(goalComments.isPrivate, false),
        ),
      );

    if (!comment) {
      this.logger.warn({ commentId }, 'goal:deleteComment:not-found-or-denied');
      throw new BadRequestException('Comment not found or inaccessible');
    }

    await this.db.delete(goalComments).where(eq(goalComments.id, commentId));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'goal_comment',
      entityId: commentId,
      userId,
      details: `Deleted comment on goal ${comment.goalId} by user ${userId}`,
    });

    // No burst (comments aren’t cached)
    this.logger.info({ commentId }, 'goal:deleteComment:done');
    return { message: 'Comment deleted successfully' };
  }

  async uploadGoalAttachment(
    goalId: string,
    dto: UploadGoalAttachmentDto,
    user: User,
  ) {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, goalId }, 'goal:uploadAttachment:start');

    const folder = await this.getOrCreateGoalFolder(
      companyId,
      'Goal Attachments',
    );

    const { file, comment } = dto;
    const [meta, base64Data] = file.base64.split(',');
    const mimeMatch = meta.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1];
    if (!mimeType || !base64Data) {
      this.logger.warn({ goalId }, 'goal:uploadAttachment:bad-file');
      throw new BadRequestException('Invalid file format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `company-files/${companyId}/${folder.id}/${Date.now()}-${file.name}`;

    const { url } = await this.s3Service.uploadBuffer(
      buffer,
      key,
      companyId,
      'goal_attachment',
      'attachment',
      mimeType,
    );

    const [attachment] = await this.db
      .insert(goalAttachments)
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
    this.logger.info(
      { goalId, attachmentId: attachment.id },
      'goal:uploadAttachment:done',
    );
    return attachment;
  }

  async updateAttachment(
    attachmentId: string,
    user: User,
    dto: UpdateGoalAttachmentDto,
  ) {
    const { id: userId, companyId } = user;
    this.logger.info({ attachmentId, userId }, 'goal:updateAttachment:start');

    const [attachment] = await this.db
      .select()
      .from(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId));
    if (!attachment) {
      this.logger.warn({ attachmentId }, 'goal:updateAttachment:not-found');
      throw new BadRequestException('Attachment not found');
    }
    if (attachment.uploadedById !== userId) {
      this.logger.warn(
        { attachmentId, userId },
        'goal:updateAttachment:not-owner',
      );
      throw new BadRequestException(
        'You do not have permission to update this attachment',
      );
    }

    const { file, comment } = dto;

    if (file) {
      const [meta, base64Data] = file.base64.split(',');
      const mimeMatch = meta.match(/data:(.*);base64/);
      const mimeType = mimeMatch?.[1];
      if (!mimeType || !base64Data) {
        this.logger.warn({ attachmentId }, 'goal:updateAttachment:bad-file');
        throw new BadRequestException('Invalid file format');
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const key = `company-files/${companyId}/Goal Attachments/${Date.now()}-${file.name}`;
      const { url } = await this.s3Service.uploadBuffer(
        buffer,
        key,
        companyId,
        'goal_attachment',
        'attachment',
        mimeType,
      );

      const [updatedAttachment] = await this.db
        .update(goalAttachments)
        .set({
          fileUrl: url,
          fileName: file.name,
          comment,
          updatedAt: new Date(),
        })
        .where(eq(goalAttachments.id, attachmentId))
        .returning();

      await this.burst({ companyId, goalId: updatedAttachment.goalId });
      this.logger.info({ attachmentId }, 'goal:updateAttachment:done');
      return updatedAttachment;
    } else {
      const [updatedAttachment] = await this.db
        .update(goalAttachments)
        .set({ comment, updatedAt: new Date() })
        .where(eq(goalAttachments.id, attachmentId))
        .returning();

      await this.burst({ companyId, goalId: updatedAttachment.goalId });
      this.logger.info({ attachmentId }, 'goal:updateAttachment:done');
      return updatedAttachment;
    }
  }

  async deleteAttachment(attachmentId: string, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ attachmentId, userId }, 'goal:deleteAttachment:start');

    const [attachment] = await this.db
      .select()
      .from(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId));

    if (!attachment) {
      this.logger.warn({ attachmentId }, 'goal:deleteAttachment:not-found');
      throw new BadRequestException('Attachment not found');
    }
    if (attachment.uploadedById !== user.id) {
      this.logger.warn(
        { attachmentId, userId },
        'goal:deleteAttachment:not-owner',
      );
      throw new BadRequestException(
        'You do not have permission to delete this attachment',
      );
    }

    await this.s3Service.deleteFileFromS3(attachment.fileUrl);

    await this.db
      .delete(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId));

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

  private async getOrCreateGoalFolder(companyId: string, name: string) {
    let [folder] = await this.db
      .select()
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.companyId, companyId),
          eq(companyFileFolders.name, name),
        ),
      );

    if (!folder) {
      [folder] = await this.db
        .insert(companyFileFolders)
        .values({ companyId, name, createdAt: new Date() })
        .returning();
    }

    return folder;
  }
}
