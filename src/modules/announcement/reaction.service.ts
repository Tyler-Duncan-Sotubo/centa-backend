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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ReactionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string, announcementId: string) {
    return [
      `company:${companyId}:announcements`,
      `company:${companyId}:announcement:${announcementId}:reactions`,
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

  async reactToAnnouncement(
    announcementId: string,
    reactionType: string, // like, love, celebrate, sad, angry, clap, happy
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

    // ensure announcement exists + get companyId for cache versioning
    const [announcement] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .execute();

    if (!announcement) {
      throw new BadRequestException('Announcement not found');
    }

    // toggle logic
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

    let result: any = { toggledOff: false };

    if (existingReaction) {
      await this.db
        .delete(announcementReactions)
        .where(eq(announcementReactions.id, existingReaction.id))
        .execute();
      result = { toggledOff: true };
    } else {
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

      result = newReaction;
    }

    // invalidate all cached reaction reads for this company/announcement via version bump
    await this.cache.bumpCompanyVersion(announcement.companyId);

    return result;
  }

  async getReactions(announcementId: string) {
    const companyId = await this.getCompanyIdForAnnouncement(announcementId);
    return this.cache.getOrSetVersioned(
      companyId,
      ['announcement', announcementId, 'reactions', 'list'],
      async () => {
        return this.db
          .select()
          .from(announcementReactions)
          .where(eq(announcementReactions.announcementId, announcementId))
          .orderBy(desc(announcementReactions.createdAt))
          .execute();
      },
      {
        tags: this.tags(companyId, announcementId),
      },
    );
  }

  async countReactionsByType(announcementId: string) {
    const companyId = await this.getCompanyIdForAnnouncement(announcementId);
    return this.cache.getOrSetVersioned(
      companyId,
      ['announcement', announcementId, 'reactions', 'counts'],
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
      },
      {
        tags: this.tags(companyId, announcementId),
      },
    );
  }

  async hasUserReacted(
    announcementId: string,
    userId: string,
  ): Promise<boolean> {
    const companyId = await this.getCompanyIdForAnnouncement(announcementId);
    return this.cache.getOrSetVersioned(
      companyId,
      ['announcement', announcementId, 'reactions', 'hasUser', userId],
      async () => {
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
      },
      {
        tags: this.tags(companyId, announcementId),
      },
    );
  }
}
