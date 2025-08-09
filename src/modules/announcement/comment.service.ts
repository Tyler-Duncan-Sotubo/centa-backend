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
import { REACTION_TYPES, ReactionType } from './types/reaction-types';
import { AnnouncementCacheService } from 'src/common/cache/announcement-cache.service';

@Injectable()
export class CommentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
    private readonly announcementCache: AnnouncementCacheService,
  ) {}

  // ------- cache keys -------
  private commentsKey(announcementId: string) {
    return `announcement:${announcementId}:comments`; // list of comments w/ author info
  }
  private reactionCountsKey(announcementId: string) {
    return `announcement:${announcementId}:comment-reaction-counts`; // map of {commentId: [{reactionType,count}]}
  }
  private async invalidateAnnouncementCaches(announcementId: string) {
    await Promise.allSettled([
      this.cache.del(this.commentsKey(announcementId)),
      this.cache.del(this.reactionCountsKey(announcementId)),
    ]);
  }

  // ------- create -------
  async createComment(
    dto: CreateAnnouncementCommentDto,
    announcementId: string,
    user: User,
  ) {
    const [announcement] = await this.db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1)
      .execute();

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    const [newComment] = await this.db
      .insert(announcementComments)
      .values({
        comment: dto.comment,
        createdBy: user.id,
        // createdAt via DB default is preferred; if column lacks default, keep this:
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

    // bust caches affected
    await this.invalidateAnnouncementCaches(announcementId);

    return newComment;
  }

  // ------- read (with caching) -------
  async getComments(announcementId: string, userId: string) {
    // 1) base comments (cached)
    const comments = await this.cache.getOrSetCache(
      this.commentsKey(announcementId),
      async () => {
        return this.db
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
      },
      // { ttl: 60 } // if your CacheService supports TTLs
    );

    if (comments.length === 0) return [];

    const commentIds = comments.map((c) => c.id);

    // 2) reaction counts for these comments (cached, user-agnostic)
    const counts = await this.cache.getOrSetCache(
      this.reactionCountsKey(announcementId),
      async () => {
        const rows = await this.db
          .select({
            commentId: commentReactions.commentId,
            reactionType: commentReactions.reactionType,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(commentReactions)
          .where(inArray(commentReactions.commentId, commentIds))
          .groupBy(commentReactions.commentId, commentReactions.reactionType)
          .execute();

        // store as { [commentId]: [{reactionType,count}] }
        const map: Record<string, { reactionType: string; count: number }[]> =
          {};
        for (const rc of rows) {
          if (!map[rc.commentId]) map[rc.commentId] = [];
          map[rc.commentId].push({
            reactionType: rc.reactionType,
            count: rc.count,
          });
        }
        return map;
      },
      // { ttl: 30 }
    );

    // 3) user-specific reactions (live, not cached)
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

    const userReactionMap = new Map<string, string[]>();
    for (const ur of userReactions) {
      if (!userReactionMap.has(ur.commentId))
        userReactionMap.set(ur.commentId, []);
      userReactionMap.get(ur.commentId)!.push(ur.reactionType);
    }

    // 4) merge
    return comments.map((c) => ({
      ...c,
      reactions: counts[c.id] || [],
      userReactions: userReactionMap.get(c.id) || [],
    }));
  }

  // ------- delete -------
  async deleteComment(commentId: string, user: User) {
    // confirm & get announcementId for cache invalidation
    const [comment] = await this.db
      .select({
        id: announcementComments.id,
        announcementId: announcementComments.announcementId,
      })
      .from(announcementComments)
      .where(
        and(
          eq(announcementComments.id, commentId),
          eq(announcementComments.createdBy, user.id),
        ),
      )
      .limit(1)
      .execute();

    if (!comment) throw new BadRequestException('Comment not found');

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

    // reactions on this comment may be cascade-deleted via FK; either way counts change
    await this.invalidateAnnouncementCaches(comment.announcementId);

    return { message: 'Comment deleted successfully' };
  }

  // ------- toggle reaction (with cache busting) -------
  async toggleCommentReaction(
    commentId: string,
    user: User,
    reactionType: ReactionType,
  ) {
    const { id: userId, companyId } = user;
    if (!REACTION_TYPES.includes(reactionType)) {
      throw new BadRequestException('Invalid reaction type');
    }

    // Need announcementId to bust caches after mutation
    const [comment] = await this.db
      .select({
        id: announcementComments.id,
        announcementId: announcementComments.announcementId,
      })
      .from(announcementComments)
      .where(eq(announcementComments.id, commentId))
      .limit(1)
      .execute();

    if (!comment) throw new BadRequestException('Comment not found');

    // Use a transaction; guard with unique(commentId, createdBy, reactionType)
    const reacted = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: commentReactions.id })
        .from(commentReactions)
        .where(
          and(
            eq(commentReactions.commentId, commentId),
            eq(commentReactions.createdBy, userId),
            eq(commentReactions.reactionType, reactionType),
          ),
        )
        .limit(1)
        .execute();

      if (existing) {
        await tx
          .delete(commentReactions)
          .where(eq(commentReactions.id, existing.id))
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

      // Insert, ignore race duplicates if another concurrent insert wins
      await tx
        .insert(commentReactions)
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
      // if supported: this.cache.delByPrefix(this.announcementDetailPrefix(comment.announcementId)),
    ]);
    await Promise.allSettled([
      this.announcementCache.invalidateLists(companyId),
    ]);

    return { reacted };
  }
}
