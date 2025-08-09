import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import {
  announcementCategories,
  announcementComments,
  announcementReactions,
  announcements,
} from './schema/announcements.schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { CommentService } from './comment.service';
import { ReactionService } from './reaction.service';
import { AwsService } from 'src/common/aws/aws.service';
import {
  companyLocations,
  companyRoles,
  departments,
  users,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AnnouncementCacheService } from 'src/common/cache/announcement-cache.service';

@Injectable()
export class AnnouncementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly commentService: CommentService,
    private readonly reactionService: ReactionService,
    private readonly awsService: AwsService,
    private readonly announcementCache: AnnouncementCacheService,
    private readonly cache: CacheService,
  ) {}

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `company:${companyId}:announcements:list:full`;
  }
  private listTwoKey(companyId: string) {
    return `company:${companyId}:announcements:list:2`;
  }
  private oneKey(id: string, userId: string) {
    // includes userId because "likedByCurrentUser" and comments include user-specific flags
    return `announcement:${id}:detail:user:${userId}`;
  }
  private createFormKey(companyId: string) {
    return `company:${companyId}:announcements:create-elements`;
  }

  private async invalidateLists(companyId: string) {
    await this.announcementCache.invalidateLists(companyId);
  }
  private async invalidateOne(id: string, companyId: string) {
    await Promise.allSettled([
      this.announcementCache.invalidateLists(companyId),
    ]);
  }

  // ---------- create ----------
  create(dto: CreateAnnouncementDto, user: User) {
    return this.db.transaction(async (tx) => {
      const [existingAnnouncement] = await tx
        .select()
        .from(announcements)
        .where(eq(announcements.title, dto.title))
        .limit(1)
        .execute();

      if (existingAnnouncement) {
        throw new BadRequestException(
          'Announcement with this title already exists',
        );
      }

      let image = dto.image;

      if (image?.startsWith('data:image')) {
        const fileName = `receipt-${Date.now()}.jpg`;
        image = await this.awsService.uploadImageToS3(
          user.companyId,
          fileName,
          image,
        );
      }

      const [newAnnouncement] = await tx
        .insert(announcements)
        .values({
          title: dto.title,
          body: dto.body,
          createdBy: user.id,
          createdAt: new Date(),
          companyId: user.companyId,
          image,
          link: dto.link || '',
          departmentId: dto.departmentId || null,
          locationId: dto.locationId || null,
          publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
          isPublished: dto.isPublished || true,
          categoryId: dto.categoryId,
        })
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'create',
        entity: 'announcement',
        entityId: newAnnouncement.id,
        userId: user.id,
        details: `Created announcement with title: ${newAnnouncement.title}`,
        changes: {
          title: newAnnouncement.title,
          body: newAnnouncement.body,
          publishedAt: newAnnouncement.publishedAt,
        },
      });

      // Invalidate list caches
      await this.invalidateLists(user.companyId);

      return newAnnouncement;
    });
  }

  // ---------- read: list (cached) ----------
  async findAll(companyId: string) {
    return this.cache.getOrSetCache(this.listKey(companyId), async () => {
      const allAnnouncements = await this.db
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          publishedAt: announcements.publishedAt,
          category: announcementCategories.name,
          categoryId: announcements.categoryId,
          createdBy:
            sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as(
              'createdBy',
            ),
          role: companyRoles.name,
          avatarUrl: users.avatar,
        })
        .from(announcements)
        .innerJoin(users, eq(announcements.createdBy, users.id))
        .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
        .leftJoin(
          announcementCategories,
          eq(announcements.categoryId, announcementCategories.id),
        )
        .where(eq(announcements.companyId, companyId))
        .orderBy(desc(announcements.publishedAt))
        .limit(20)
        .execute();

      const ids = allAnnouncements.map((a) => a.id);
      if (ids.length === 0) return [];

      const reactionCount = await this.db
        .select({
          announcementId: announcementReactions.announcementId,
          reactionType: announcementReactions.reactionType,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(announcementReactions)
        .where(inArray(announcementReactions.announcementId, ids))
        .groupBy(
          announcementReactions.announcementId,
          announcementReactions.reactionType,
        )
        .execute();

      const reactionMap = new Map<string, Record<string, number>>();
      for (const r of reactionCount) {
        if (!reactionMap.has(r.announcementId)) {
          reactionMap.set(r.announcementId, {});
        }
        reactionMap.get(r.announcementId)![r.reactionType] = r.count;
      }

      const commentCount = await this.db
        .select({
          announcementId: announcementComments.announcementId,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(announcementComments)
        .where(inArray(announcementComments.announcementId, ids))
        .groupBy(announcementComments.announcementId)
        .execute();

      const commentCountMap = new Map<string, number>();
      for (const c of commentCount)
        commentCountMap.set(c.announcementId, c.count);

      return allAnnouncements.map((a) => ({
        id: a.id,
        category: a.category,
        categoryId: a.categoryId,
        title: a.title,
        body: a.body,
        reactionCounts: reactionMap.get(a.id) || {},
        commentCount: commentCountMap.get(a.id) || 0,
        publishedAt: a.publishedAt,
        createdBy: a.createdBy,
        role: a.role,
        avatarUrl: a.avatarUrl,
      }));
    });
  }

  async findAllLimitTwo(companyId: string) {
    return this.cache.getOrSetCache(
      this.listTwoKey(companyId),
      async () => {
        const allAnnouncements = await this.db
          .select({
            id: announcements.id,
            title: announcements.title,
            body: announcements.body,
            publishedAt: announcements.publishedAt,
            category: announcementCategories.name,
            categoryId: announcements.categoryId,
            createdBy:
              sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as(
                'createdBy',
              ),
            role: companyRoles.name,
            avatarUrl: users.avatar,
          })
          .from(announcements)
          .innerJoin(users, eq(announcements.createdBy, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .leftJoin(
            announcementCategories,
            eq(announcements.categoryId, announcementCategories.id),
          )
          .where(eq(announcements.companyId, companyId))
          .orderBy(desc(announcements.publishedAt))
          .limit(2)
          .execute();

        const ids = allAnnouncements.map((a) => a.id);
        if (ids.length === 0) return [];

        const reactionCount = await this.db
          .select({
            announcementId: announcementReactions.announcementId,
            reactionType: announcementReactions.reactionType,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(announcementReactions)
          .where(inArray(announcementReactions.announcementId, ids))
          .groupBy(
            announcementReactions.announcementId,
            announcementReactions.reactionType,
          )
          .execute();

        const reactionMap = new Map<string, Record<string, number>>();
        for (const r of reactionCount) {
          if (!reactionMap.has(r.announcementId))
            reactionMap.set(r.announcementId, {});
          reactionMap.get(r.announcementId)![r.reactionType] = r.count;
        }

        const commentCount = await this.db
          .select({
            announcementId: announcementComments.announcementId,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(announcementComments)
          .where(inArray(announcementComments.announcementId, ids))
          .groupBy(announcementComments.announcementId)
          .execute();

        const commentCountMap = new Map<string, number>();
        for (const c of commentCount)
          commentCountMap.set(c.announcementId, c.count);

        return allAnnouncements.map((a) => ({
          id: a.id,
          title: a.title,
          reactionCounts: reactionMap.get(a.id) || {},
          commentCount: commentCountMap.get(a.id) || 0,
          publishedAt: a.publishedAt,
          createdBy: a.createdBy,
          avatarUrl: a.avatarUrl,
        }));
      },
      // { ttl: 30 }
    );
  }

  // ---------- read: one (cached per user; short TTL) ----------
  async findOne(id: string, userId: string) {
    return this.cache.getOrSetCache(this.oneKey(id, userId), async () => {
      const [announcement, likeCount, likedByCurrentUser, comments] =
        await Promise.all([
          this.db
            .select()
            .from(announcements)
            .where(eq(announcements.id, id))
            .execute()
            .then(([res]) => {
              if (!res)
                throw new BadRequestException(
                  `Announcement with id ${id} not found`,
                );
              return res;
            }),
          this.reactionService.countReactionsByType(id),
          this.reactionService.hasUserReacted(id, userId),
          this.commentService.getComments(id, userId),
        ]);

      return {
        announcement,
        likeCount,
        likedByCurrentUser,
        comments,
      };
    });
  }

  // ---------- update (invalidate) ----------
  async update(id: string, dto: UpdateAnnouncementDto, user: User) {
    return this.db.transaction(async (tx) => {
      const [announcement] = await tx
        .select()
        .from(announcements)
        .where(eq(announcements.id, id))
        .execute();

      if (!announcement) {
        throw new BadRequestException(`Announcement with id ${id} not found`);
      }

      const [updatedAnnouncement] = await tx
        .update(announcements)
        .set({
          title: dto.title,
          body: dto.body,
          image: dto.image,
          link: dto.link || '',
          departmentId: dto.departmentId || null,
          locationId: dto.locationId || null,
          categoryId: dto.categoryId,
          publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        })
        .where(eq(announcements.id, id))
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'update',
        entity: 'announcement',
        entityId: updatedAnnouncement.id,
        userId: user.id,
        details: `Updated announcement with title: ${updatedAnnouncement.title}`,
        changes: {
          title: updatedAnnouncement.title,
          body: updatedAnnouncement.body,
          publishedAt: updatedAnnouncement.publishedAt,
        },
      });

      // Invalidate caches
      await this.invalidateOne(id, announcement.companyId);

      return updatedAnnouncement;
    });
  }

  // ---------- delete (invalidate) ----------
  remove(id: string, user: User) {
    return this.db.transaction(async (tx) => {
      const [announcement] = await tx
        .select()
        .from(announcements)
        .where(eq(announcements.id, id))
        .execute();

      if (!announcement) {
        throw new BadRequestException(`Announcement with id ${id} not found`);
      }

      await tx.delete(announcements).where(eq(announcements.id, id)).execute();

      await this.auditService.logAction({
        action: 'delete',
        entity: 'announcement',
        entityId: id,
        userId: user.id,
        details: `Deleted announcement with title: ${announcement.title}`,
      });

      // Invalidate caches
      await this.invalidateOne(id, announcement.companyId);

      return { message: 'Announcement deleted successfully' };
    });
  }

  // ---------- create page elements (cached) ----------
  async getAllCreateElements(companyId: string) {
    return this.cache.getOrSetCache(this.createFormKey(companyId), async () => {
      const [categories, allDepartments, AllLocations] = await Promise.all([
        this.db
          .select({
            id: announcementCategories.id,
            name: announcementCategories.name,
          })
          .from(announcementCategories)
          .where(eq(announcementCategories.companyId, companyId))
          .execute(),

        this.db
          .select({
            id: departments.id,
            name: departments.name,
          })
          .from(departments)
          .where(eq(departments.companyId, companyId))
          .execute(),

        this.db
          .select({
            id: companyLocations.id,
            name: companyLocations.name,
          })
          .from(companyLocations)
          .where(eq(companyLocations.companyId, companyId))
          .execute(),
      ]);

      return {
        categories,
        departments: allDepartments,
        locations: AllLocations,
      };
    });
  }
}
