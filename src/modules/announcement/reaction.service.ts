import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import {
  announcementReactions,
  announcements,
} from './schema/announcements.schema';
import { CacheService } from 'src/common/cache/cache.service';
import { REACTION_TYPES, ReactionType } from './types/reaction-types';

@Injectable()
export class ReactionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private reactionsCacheKey(announcementId: string) {
    return `announcement:${announcementId}:reactions`;
  }
  private reactionCountsKey(announcementId: string) {
    return `announcement:${announcementId}:reaction-counts`;
  }

  async reactToAnnouncement(
    announcementId: string,
    reactionType: ReactionType,
    user: { id: string },
  ) {
    if (!REACTION_TYPES.includes(reactionType)) {
      throw new BadRequestException('Invalid reaction type');
    }

    // ensure announcement exists
    const [announcement] = await this.db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1)
      .execute();

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    // run in a transaction to avoid races
    return this.db.transaction(async (tx) => {
      // do we already have the same reaction?
      const [existingSameType] = await tx
        .select({ id: announcementReactions.id })
        .from(announcementReactions)
        .where(
          and(
            eq(announcementReactions.announcementId, announcementId),
            eq(announcementReactions.createdBy, user.id),
            eq(announcementReactions.reactionType, reactionType),
          ),
        )
        .limit(1)
        .execute();

      if (existingSameType) {
        await tx
          .delete(announcementReactions)
          .where(eq(announcementReactions.id, existingSameType.id))
          .execute();

        await this.auditService.logAction({
          action: 'reaction_removed',
          entity: 'announcement',
          entityId: announcementId,
          userId: user.id,
          details: `User ${user.id} un-reacted (${reactionType}) on announcement ${announcementId}`,
          changes: { id: existingSameType.id, reactionType },
        });
      } else {
        const [inserted] = await tx
          .insert(announcementReactions)
          .values({
            announcementId,
            createdBy: user.id,
            reactionType,
            // createdAt uses DB default
          })
          .returning()
          .execute();

        await this.auditService.logAction({
          action: 'reaction_added',
          entity: 'announcement',
          entityId: announcementId,
          userId: user.id,
          details: `User ${user.id} reacted with ${reactionType} on announcement ${announcementId}`,
          changes: inserted,
        });
      }

      // bust caches impacted by this mutation
      await Promise.allSettled([
        this.cache.del(this.reactionsCacheKey(announcementId)),
        this.cache.del(this.reactionCountsKey(announcementId)),
      ]);

      // return fresh (optional)
      const [fresh] = await tx
        .select()
        .from(announcementReactions)
        .where(
          and(
            eq(announcementReactions.announcementId, announcementId),
            eq(announcementReactions.createdBy, user.id),
            eq(announcementReactions.reactionType, reactionType),
          ),
        )
        .execute();

      return fresh ?? null; // null if toggled off
    });
  }

  async getReactions(announcementId: string) {
    const cacheKey = this.reactionsCacheKey(announcementId);
    return this.cache.getOrSetCache(cacheKey, async () => {
      return this.db
        .select()
        .from(announcementReactions)
        .where(eq(announcementReactions.announcementId, announcementId))
        .orderBy(desc(announcementReactions.createdAt))
        .execute();
    });
  }

  async countReactionsByType(announcementId: string) {
    const cacheKey = this.reactionCountsKey(announcementId);
    return this.cache.getOrSetCache(
      cacheKey,
      async () => {
        return this.db
          .select({
            reactionType: announcementReactions.reactionType,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(announcementReactions)
          .where(eq(announcementReactions.announcementId, announcementId))
          .groupBy(announcementReactions.reactionType)
          .execute();
      } /*, { ttl: 30 }*/,
    );
  }

  async hasUserReacted(announcementId: string, userId: string) {
    const [reaction] = await this.db
      .select({ id: announcementReactions.id })
      .from(announcementReactions)
      .where(
        and(
          eq(announcementReactions.announcementId, announcementId),
          eq(announcementReactions.createdBy, userId),
        ),
      )
      .limit(1)
      .execute();

    return !!reaction;
  }
}
