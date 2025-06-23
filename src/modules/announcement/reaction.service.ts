import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import {
  announcementReactions,
  announcements,
} from './schema/announcements.schema';
import { desc, eq, and, sql } from 'drizzle-orm';

@Injectable()
export class ReactionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async reactToAnnouncement(
    announcementId: string,
    reactionType: string, // like, love, celebrate, sad, angry
    user: User,
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

    // Check if announcement exists
    const [announcement] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .execute();

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    // Check if user already reacted with this type
    const [existingReaction] = await this.db
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

    if (existingReaction) {
      // If already reacted, toggle off (un-react)
      await this.db
        .delete(announcementReactions)
        .where(eq(announcementReactions.id, existingReaction.id))
        .execute();
    } else {
      // Insert new reaction
      const [newReaction] = await this.db
        .insert(announcementReactions)
        .values({
          announcementId,
          createdBy: user.id,
          reactionType,
          createdAt: new Date(),
        })
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'reaction',
        entity: 'announcement',
        entityId: announcementId,
        userId: user.id,
        details: `User ${user.id} reacted with ${reactionType} on announcement ${announcementId}`,
        changes: newReaction,
      });

      return newReaction;
    }
  }

  async getReactions(announcementId: string) {
    // Get all reactions for an announcement
    return this.db
      .select()
      .from(announcementReactions)
      .where(eq(announcementReactions.announcementId, announcementId))
      .orderBy(desc(announcementReactions.createdAt))
      .execute();
  }

  async countReactionsByType(announcementId: string) {
    // Aggregate counts per reaction type
    return this.db
      .select({
        reactionType: announcementReactions.reactionType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(announcementReactions)
      .where(eq(announcementReactions.announcementId, announcementId))
      .groupBy(announcementReactions.reactionType)
      .execute();
  }

  async hasUserReacted(
    announcementId: string,
    userId: string,
  ): Promise<boolean> {
    const [reaction] = await this.db
      .select()
      .from(announcementReactions)
      .where(
        and(
          eq(announcementReactions.announcementId, announcementId),
          eq(announcementReactions.createdBy, userId),
        ),
      )
      .execute();

    return !!reaction;
  }
}
