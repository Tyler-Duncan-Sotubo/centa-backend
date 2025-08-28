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

@Injectable()
export class GoalActivityService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly s3Service: S3StorageService,
  ) {}

  async addProgressUpdate(goalId: string, dto: AddGoalProgressDto, user: User) {
    const { id: userId, companyId } = user;
    const { progress, note } = dto;

    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    // 1. Ensure the goal exists
    const [goal] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.isArchived, false), // Ensure goal is not archived
        ),
      );

    if (!goal) {
      throw new BadRequestException('Goal not found');
    }

    // 2. Get latest progress
    const [latestUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, goalId))
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1);

    const lastProgress = latestUpdate?.progress ?? 0;

    // 3. Prevent downgrade or duplicate 100% updates
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

    // 4. Insert new progress update
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

    if (dto.progress === 100) {
      await this.db
        .update(performanceGoals)
        .set({ status: 'completed', updatedAt: new Date(), updatedBy: userId })
        .where(eq(performanceGoals.id, goalId))
        .returning();
    }

    return update;
  }

  async getLatestProgressValue(
    goalId: string,
    companyId: string,
  ): Promise<number> {
    // Single round-trip with a join to ensure the goal belongs to the company & isn’t archived
    const [row] = await this.db
      .select({ progress: performanceGoalUpdates.progress })
      .from(performanceGoalUpdates)
      .innerJoin(
        performanceGoals,
        eq(performanceGoals.id, performanceGoalUpdates.goalId),
      )
      .where(
        and(
          eq(performanceGoalUpdates.goalId, goalId),
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.isArchived, false),
        ),
      )
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1);

    return row?.progress ?? 0;
  }

  async updateNote(goalId: string, note: string, user: User) {
    const { id: userId } = user;

    // 1. Ensure the goal exists
    const [goalUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.id, goalId));

    if (!goalUpdate) {
      throw new BadRequestException('Goal not found');
    }

    if (goalUpdate.createdBy !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this goal',
      );
    }

    // 2. Update the note
    const [updatedGoal] = await this.db
      .update(performanceGoals)
      .set({ note, updatedAt: new Date(), updatedBy: userId })
      .where(eq(performanceGoals.id, goalId))
      .returning();

    // 3. Log the update in audit
    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_goal',
      entityId: goalId,
      userId,
      details: `Updated note for goal ${goalId}`,
      changes: { note },
    });

    return updatedGoal;
  }

  async addComment(goalId: string, user: User, dto: AddGoalCommentDto) {
    const { id: userId, companyId } = user;

    // 1. Ensure the goal exists
    const [goal] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.isArchived, false), // Ensure goal is not archived
        ),
      );

    if (!goal) {
      throw new BadRequestException('Goal not found');
    }

    await this.db
      .insert(goalComments)
      .values({ ...dto, authorId: userId, goalId });

    return { message: 'Comment added successfully' };
  }

  async updateComment(commentId: string, user: User, content: string) {
    const { id: userId } = user;

    // 1. Ensure the comment exists
    const [comment] = await this.db
      .select()
      .from(goalComments)
      .where(
        and(
          eq(goalComments.id, commentId),
          eq(goalComments.authorId, userId), // Ensure the user is the author
          eq(goalComments.isPrivate, false), // Ensure the comment is not private
        ),
      );

    if (!comment) {
      throw new BadRequestException('Comment not found or inaccessible');
    }

    // 2. Update the comment
    const [updatedComment] = await this.db
      .update(goalComments)
      .set({ comment: content, updatedAt: new Date() })
      .where(eq(goalComments.id, commentId))
      .returning();

    // 3. Log the update in audit
    await this.auditService.logAction({
      action: 'update',
      entity: 'goal_comment',
      entityId: commentId,
      userId,
      details: `Updated comment on goal ${comment.goalId} by user ${userId}`,
      changes: { content },
    });

    return updatedComment;
  }

  async deleteComment(commentId: string, user: User) {
    const { id: userId } = user;
    // 1. Ensure the comment exists
    const [comment] = await this.db
      .select()
      .from(goalComments)
      .where(
        and(
          eq(goalComments.id, commentId),
          eq(goalComments.authorId, userId), // Ensure the user is the author
          eq(goalComments.isPrivate, false), // Ensure the comment is not private
        ),
      );

    if (!comment) {
      throw new BadRequestException('Comment not found or inaccessible');
    }

    await this.db
      .delete(goalComments)
      .where(eq(goalComments.id, commentId))
      .returning();

    // 2.log the deletion in audit
    await this.auditService.logAction({
      action: 'delete',
      entity: 'goal_comment',
      entityId: commentId,
      userId: user.id,
      details: `Deleted comment on goal ${comment.goalId} by user ${userId}`,
    });

    return { message: 'Comment deleted successfully' };
  }

  async uploadGoalAttachment(
    goalId: string,
    dto: UploadGoalAttachmentDto,
    user: User,
  ) {
    const { id: userId, companyId } = user;
    const { file, comment } = dto;

    // 1. Get or create "Goal Attachments" folder
    const folderName = 'Goal Attachments';
    const folder = await this.getOrCreateGoalFolder(companyId, folderName);

    // 2. Parse file
    const [meta, base64Data] = file.base64.split(',');
    const mimeMatch = meta.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1];
    if (!mimeType || !base64Data) {
      throw new BadRequestException('Invalid file format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `company-files/${companyId}/${folder.id}/${Date.now()}-${file.name}`;

    // 3. Upload to S3
    const { url } = await this.s3Service.uploadBuffer(
      buffer,
      key,
      companyId,
      'goal_attachment',
      'attachment',
      mimeType,
    );

    // 4. Insert into performance_goal_attachments table
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

    // 5. Log action
    await this.auditService.logAction({
      action: 'upload',
      entity: 'goal_attachment',
      entityId: attachment.id,
      userId,
      details: `Uploaded attachment for goal ${goalId}`,
      changes: {
        fileName: file.name,
        url,
      },
    });

    return attachment;
  }

  async updateAttachment(
    attachmentId: string,
    user: User,
    dto: UpdateGoalAttachmentDto,
  ) {
    const { id: userId, companyId } = user;
    const { file, comment } = dto;

    // 1. Ensure the attachment exists
    const [attachment] = await this.db
      .select()
      .from(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId));
    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    // 2. Ensure the user has permission to update it
    if (attachment.uploadedById !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this attachment',
      );
    }

    if (file) {
      // 3. Parse file
      const [meta, base64Data] = file.base64.split(',');
      const mimeMatch = meta.match(/data:(.*);base64/);
      const mimeType = mimeMatch?.[1];
      if (!mimeType || !base64Data) {
        throw new BadRequestException('Invalid file format');
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const key = `company-files/${companyId}/Goal Attachments/${Date.now()}-${file.name}`;

      // 4. Upload to S3
      const { url } = await this.s3Service.uploadBuffer(
        buffer,
        key,
        companyId,
        'goal_attachment',
        'attachment',
        mimeType,
      );

      // 5. Update the attachment in the database
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

      return updatedAttachment;
    } else {
      // 6. Update only the comment if no file is provided
      const [updatedAttachment] = await this.db
        .update(goalAttachments)
        .set({
          comment,
          updatedAt: new Date(),
        })
        .where(eq(goalAttachments.id, attachmentId))
        .returning();

      return updatedAttachment;
    }
  }

  async deleteAttachment(attachmentId: string, user: User) {
    // 1. Ensure the attachment exists
    const [attachment] = await this.db
      .select()
      .from(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId));

    // 2. Ensure the user has permission to delete it
    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    if (attachment.uploadedById !== user.id) {
      throw new BadRequestException(
        'You do not have permission to delete this attachment',
      );
    }

    await this.s3Service.deleteFileFromS3(attachment.fileUrl);

    // 3. Delete the attachment
    await this.db
      .delete(goalAttachments)
      .where(eq(goalAttachments.id, attachmentId))
      .returning();

    // 4. Log the deletion in audit
    await this.auditService.logAction({
      action: 'delete',
      entity: 'goal_attachment',
      entityId: attachmentId,
      userId: user.id,
      details: `Deleted attachment for goal ${attachment.goalId} by user ${user.id}`,
    });
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
        .values({
          companyId,
          name,
          createdAt: new Date(),
        })
        .returning();
    }

    return folder;
  }
}
