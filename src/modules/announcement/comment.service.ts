import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import {
  announcementComments,
  announcements,
  commentReactions,
} from './schema/announcements.schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comments.dto';
import { users } from '../auth/schema';

@Injectable()
export class CommentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async createComment(
    dto: CreateAnnouncementCommentDto,
    announcementId: string,
    user: User,
  ) {
    // Check if the announcement exists
    const [announcement] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .execute();

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    // Insert the comment into the database
    const [newComment] = await this.db
      .insert(announcementComments)
      .values({
        comment: dto.comment,
        createdBy: user.id,
        createdAt: new Date(),
        announcementId: announcementId,
      })
      .returning()
      .execute();

    // Log the creation in the audit service
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

  async getComments(announcementId: string, userId: string) {
    const comments = await this.db
      .select({
        id: announcementComments.id,
        comment: announcementComments.comment,
        createdAt: announcementComments.createdAt,
        createdBy:
          sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as(
            'createdBy',
          ),
        avatarUrl: users.avatar,
      })
      .from(announcementComments)
      .innerJoin(users, eq(announcementComments.createdBy, users.id))
      .where(eq(announcementComments.announcementId, announcementId))
      .orderBy(desc(announcementComments.createdAt))
      .execute();

    const commentIds = comments.map((c) => c.id);

    if (commentIds.length === 0) return [];

    // 1️⃣ Reactions count (already grouped per reactionType)
    const reactionCounts = await this.db
      .select({
        commentId: commentReactions.commentId,
        reactionType: commentReactions.reactionType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(commentReactions)
      .where(inArray(commentReactions.commentId, commentIds))
      .groupBy(commentReactions.commentId, commentReactions.reactionType)
      .execute();

    // 2️⃣ User reactions for current user
    const userReactions = await this.db
      .select({
        commentId: commentReactions.commentId,
        reactionType: commentReactions.reactionType,
      })
      .from(commentReactions)
      .where(
        and(
          inArray(commentReactions.commentId, commentIds),
          eq(commentReactions.createdBy, userId),
        ),
      )
      .execute();

    // 3️⃣ Build maps for quick access
    const userReactionMap = new Map<string, string[]>();
    userReactions.forEach((ur) => {
      if (!userReactionMap.has(ur.commentId)) {
        userReactionMap.set(ur.commentId, []);
      }
      userReactionMap.get(ur.commentId)!.push(ur.reactionType);
    });

    const reactionCountMap = new Map<
      string,
      { reactionType: string; count: number }[]
    >();
    reactionCounts.forEach((rc) => {
      if (!reactionCountMap.has(rc.commentId)) {
        reactionCountMap.set(rc.commentId, []);
      }
      reactionCountMap.get(rc.commentId)!.push({
        reactionType: rc.reactionType,
        count: rc.count,
      });
    });

    // 4️⃣ Final response
    return comments.map((comment) => ({
      ...comment,
      reactions: reactionCountMap.get(comment.id) || [],
      userReactions: userReactionMap.get(comment.id) || [],
    }));
  }

  async deleteComment(commentId: string, user: User) {
    // Check if the comment exists
    const [comment] = await this.db
      .select()
      .from(announcementComments)
      .where(
        and(
          eq(announcementComments.id, commentId),
          eq(announcementComments.createdBy, user.id),
        ),
      )
      .execute();

    if (!comment) {
      throw new BadRequestException('Comment not found');
    }

    // Delete the comment from the database
    await this.db
      .delete(announcementComments)
      .where(eq(announcementComments.id, commentId))
      .execute();

    // Log the deletion in the audit service
    await this.auditService.logAction({
      action: 'delete',
      entity: 'announcement_comment',
      entityId: commentId,
      userId: user.id,
      details: `Deleted comment with ID: ${commentId}`,
    });

    return { message: 'Comment deleted successfully' };
  }

  // Reactions on Comments
  async toggleCommentReaction(
    commentId: string,
    userId: string,
    reactionType: string,
  ) {
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
      throw new BadRequestException('Invalid reaction type');
    }

    // Check if user has already reacted with this type
    const [existingReaction] = await this.db
      .select()
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.createdBy, userId),
          eq(commentReactions.reactionType, reactionType),
        ),
      )
      .execute();

    if (existingReaction) {
      // User already reacted — remove reaction (toggle off)
      await this.db
        .delete(commentReactions)
        .where(eq(commentReactions.id, existingReaction.id))
        .execute();

      return { reacted: false };
    } else {
      // Insert new reaction
      await this.db
        .insert(commentReactions)
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
}
