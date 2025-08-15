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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CommentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string, announcementId: string) {
    return [
      `company:${companyId}:announcements`,
      `company:${companyId}:announcement:${announcementId}:comments`,
    ];
  }

  private async getCompanyIdForAnnouncement(
    announcementId: string,
  ): Promise<string> {
    const [row] = await this.db
      .select({ companyId: announcements.companyId })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .execute();
    if (!row) throw new BadRequestException('Announcement not found');
    return row.companyId;
  }

  private async getCompanyIdForComment(
    commentId: string,
  ): Promise<{ companyId: string; announcementId: string }> {
    const [row] = await this.db
      .select({
        companyId: announcements.companyId,
        announcementId: announcementComments.announcementId,
      })
      .from(announcementComments)
      .innerJoin(
        announcements,
        eq(announcementComments.announcementId, announcements.id),
      )
      .where(eq(announcementComments.id, commentId))
      .execute();
    if (!row) throw new BadRequestException('Comment not found');
    return row;
  }

  async createComment(
    dto: CreateAnnouncementCommentDto,
    announcementId: string,
    user: User,
  ) {
    // ensure announcement exists + get companyId (for version bump)
    const companyId = await this.getCompanyIdForAnnouncement(announcementId);

    const [newComment] = await this.db
      .insert(announcementComments)
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

    // invalidate all cached comment reads
    await this.cache.bumpCompanyVersion(companyId);

    return newComment;
  }

  async getComments(announcementId: string, userId: string) {
    const companyId = await this.getCompanyIdForAnnouncement(announcementId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['announcement', announcementId, 'comments', 'forUser', userId],
      async () => {
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

        // 1) reaction counts per type
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

        // 2) user reactions for this user
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

        // maps
        const userReactionMap = new Map<string, string[]>();
        for (const ur of userReactions) {
          const arr = userReactionMap.get(ur.commentId) ?? [];
          arr.push(ur.reactionType);
          userReactionMap.set(ur.commentId, arr);
        }

        const reactionCountMap = new Map<
          string,
          { reactionType: string; count: number }[]
        >();
        for (const rc of reactionCounts) {
          const arr = reactionCountMap.get(rc.commentId) ?? [];
          arr.push({ reactionType: rc.reactionType, count: rc.count });
          reactionCountMap.set(rc.commentId, arr);
        }

        return comments.map((c) => ({
          ...c,
          reactions: reactionCountMap.get(c.id) || [],
          userReactions: userReactionMap.get(c.id) || [],
        }));
      },
      {
        tags: this.tags(companyId, announcementId),
      },
    );
  }

  async deleteComment(commentId: string, user: User) {
    const { companyId } = await this.getCompanyIdForComment(commentId);

    // Ensure the comment belongs to the user
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

    await this.db
      .delete(announcementComments)
      .where(eq(announcementComments.id, commentId))
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'announcement_comment',
      entityId: commentId,
      userId: user.id,
      details: `Deleted comment with ID: ${commentId}`,
    });

    // invalidate cached comment lists
    await this.cache.bumpCompanyVersion(companyId);

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

    const { companyId } = await this.getCompanyIdForComment(commentId);

    // toggle
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

    let res: { reacted: boolean };

    if (existingReaction) {
      await this.db
        .delete(commentReactions)
        .where(eq(commentReactions.id, existingReaction.id))
        .execute();
      res = { reacted: false };
    } else {
      await this.db
        .insert(commentReactions)
        .values({
          commentId,
          createdBy: userId,
          reactionType,
          createdAt: new Date(),
        })
        .execute();
      res = { reacted: true };
    }

    // invalidate cached comments/reaction summaries
    await this.cache.bumpCompanyVersion(companyId);

    return res;
  }
}
