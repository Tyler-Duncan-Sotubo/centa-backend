import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class GoalActivityService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly s3Service: S3StorageService,
    private readonly cache: CacheService,
  ) {}

  private async invalidateGoals(companyId: string) {
    // Option A: bump version (works for all stores)
    await this.cache.bumpCompanyVersion(companyId);

    // Option B (alternative): tag invalidation (works only with native Redis)
    // await this.cache.invalidateTags([`company:${companyId}:goals`]);
  }

  async addProgressUpdate(goalId: string, dto: AddGoalProgressDto, user: User) {
    const { id: userId, companyId } = user;
    const { progress, note } = dto;

    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    // 1) Ensure the goal exists
    const [goal] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.isArchived, false),
        ),
      )
      .execute();

    if (!goal) {
      throw new BadRequestException('Goal not found');
    }

    // 2) Get latest progress
    const [latestUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, goalId))
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1)
      .execute();

    const lastProgress = latestUpdate?.progress ?? 0;

    // 3) Prevent downgrade or duplicate 100% updates
    if (lastProgress >= 100) {
      throw new BadRequestException('Goal has already been completed');
    }
    if (progress < lastProgress) {
      throw new BadRequestException(
        `Cannot set progress to a lower value (${progress} < ${lastProgress})`,
      );
    }
    if (progress === lastProgress) {
      throw new BadRequestException(
        'This progress value has already been recorded',
      );
    }

    // 4) Insert new progress update
    const [update] = await this.db
      .insert(performanceGoalUpdates)
      .values({
        goalId,
        progress,
        note,
        createdAt: new Date(),
        createdBy: userId,
      })
      .returning()
      .execute();

    // Invalidate goals caches (affects findAll/ findOne)
    await this.invalidateGoals(companyId);

    return update;
  }

  async updateNote(goalId: string, note: string, user: User) {
    const { id: userId, companyId } = user;

    // ⚠️ This checks an update record by id==goalId in your original code.
    // Keeping intent but adding .execute(); adjust if you meant goal record.
    const [goalUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.id, goalId))
      .execute();

    if (!goalUpdate) {
      throw new BadRequestException('Goal not found');
    }

    if (goalUpdate.createdBy !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this goal',
      );
    }

    const [updatedGoal] = await this.db
      .update(performanceGoals)
      .set({ note, updatedAt: new Date(), updatedBy: userId as any })
      .where(eq(performanceGoals.id, goalId))
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

  async addComment(goalId: string, user: User, dto: AddGoalCommentDto) {
    const { id: userId, companyId } = user;

    const [goal] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.isArchived, false),
        ),
      )
      .execute();

    if (!goal) {
      throw new BadRequestException('Goal not found');
    }

    await this.db
      .insert(goalComments)
      .values({ ...dto, authorId: userId, goalId })
      .execute();

    await this.invalidateGoals(companyId);

    return { message: 'Comment added successfully' };
  }

  async updateComment(commentId: string, user: User, content: string) {
    const { id: userId, companyId } = user;

    const [comment] = await this.db
      .select()
      .from(goalComments)
      .where(
        and(
          eq(goalComments.id, commentId),
          eq(goalComments.authorId, userId),
          eq(goalComments.isPrivate, false),
        ),
      )
      .execute();

    if (!comment) {
      throw new BadRequestException('Comment not found or inaccessible');
    }

    const [updatedComment] = await this.db
      .update(goalComments)
      .set({ comment: content, updatedAt: new Date() })
      .where(eq(goalComments.id, commentId))
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

  async deleteComment(commentId: string, user: User) {
    const { id: userId, companyId } = user;

    const [comment] = await this.db
      .select()
      .from(goalComments)
      .where(
        and(
          eq(goalComments.id, commentId),
          eq(goalComments.authorId, userId),
          eq(goalComments.isPrivate, false),
        ),
      )
      .execute();

    if (!comment) {
      throw new BadRequestException('Comment not found or inaccessible');
    }

    await this.db
      .delete(goalComments)
      .where(eq(goalComments.id, commentId))
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

  async uploadGoalAttachment(
    goalId: string,
    dto: UploadGoalAttachmentDto,
    user: User,
  ) {
    const { id: userId, companyId } = user;
    const { file, comment } = dto;

    const folderName = 'Goal Attachments';
    const folder = await this.getOrCreateGoalFolder(companyId, folderName);

    const [meta, base64Data] = file.base64.split(',');
    const mimeMatch = meta.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1];
    if (!mimeType || !base64Data) {
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

  async updateAttachment(
    attachmentId: string,
    user: User,
    dto: UpdateGoalAttachmentDto,
  ) {
    const { id: userId, companyId } = user;
    const { file, comment } = dto;

    const [attachment] = await this.db
      .select()
      .from(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId))
      .execute();
    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    if (attachment.uploadedById !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this attachment',
      );
    }

    if (file) {
      const [meta, base64Data] = file.base64.split(',');
      const mimeMatch = meta.match(/data:(.*);base64/);
      const mimeType = mimeMatch?.[1];
      if (!mimeType || !base64Data) {
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
        .returning()
        .execute();

      await this.invalidateGoals(companyId);

      return updatedAttachment;
    } else {
      const [updatedAttachment] = await this.db
        .update(goalAttachments)
        .set({
          comment,
          updatedAt: new Date(),
        })
        .where(eq(goalAttachments.id, attachmentId))
        .returning()
        .execute();

      await this.invalidateGoals(companyId);

      return updatedAttachment;
    }
  }

  async deleteAttachment(attachmentId: string, user: User) {
    const { companyId } = user;

    const [attachment] = await this.db
      .select()
      .from(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId))
      .execute();

    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    if (attachment.uploadedById !== user.id) {
      throw new BadRequestException(
        'You do not have permission to delete this attachment',
      );
    }

    await this.s3Service.deleteFileFromS3(attachment.fileUrl);

    await this.db
      .delete(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId))
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

  private async getOrCreateGoalFolder(companyId: string, name: string) {
    let [folder] = await this.db
      .select()
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.companyId, companyId),
          eq(companyFileFolders.name, name),
        ),
      )
      .execute();

    if (!folder) {
      [folder] = await this.db
        .insert(companyFileFolders)
        .values({ companyId, name, createdAt: new Date() })
        .returning()
        .execute();
    }

    return folder;
  }
}
