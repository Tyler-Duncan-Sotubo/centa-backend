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

@Injectable()
export class AnnouncementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly commentService: CommentService,
    private readonly reactionService: ReactionService,
    private readonly awsService: AwsService,
  ) {}
  create(dto: CreateAnnouncementDto, user: User) {
    // check for duplicate announcements
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

      // Upload base64 receipt image if provided
      if (image?.startsWith('data:image')) {
        const fileName = `receipt-${Date.now()}.jpg`; // or `.png` depending on contentType logic
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

      // Log the creation in the audit service
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

      return newAnnouncement;
    });
  }

  async findAll(companyId: string) {
    // Fetch announcements joined with categories and users
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

    const announcementIds = allAnnouncements.map((a) => a.id);

    // Fetch reactions grouped by type
    const reactionCount = await this.db
      .select({
        announcementId: announcementReactions.announcementId,
        reactionType: announcementReactions.reactionType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(announcementReactions)
      .where(inArray(announcementReactions.announcementId, announcementIds))
      .groupBy(
        announcementReactions.announcementId,
        announcementReactions.reactionType,
      )
      .execute();

    // Build reaction map
    const reactionMap = new Map<string, Record<string, number>>();
    reactionCount.forEach((r) => {
      if (!reactionMap.has(r.announcementId)) {
        reactionMap.set(r.announcementId, {});
      }
      reactionMap.get(r.announcementId)![r.reactionType] = r.count;
    });

    // Fetch comment counts
    const commentCount = await this.db
      .select({
        announcementId: announcementComments.announcementId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(announcementComments)
      .where(inArray(announcementComments.announcementId, announcementIds))
      .groupBy(announcementComments.announcementId)
      .execute();

    const commentCountMap = new Map<string, number>();
    commentCount.forEach((c) => {
      commentCountMap.set(c.announcementId, c.count);
    });

    // Return fully enriched object for frontend
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
  }

  async findAllLimitTwo(companyId: string) {
    // Fetch announcements joined with categories and users
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

    const announcementIds = allAnnouncements.map((a) => a.id);

    // Fetch reactions grouped by type
    const reactionCount = await this.db
      .select({
        announcementId: announcementReactions.announcementId,
        reactionType: announcementReactions.reactionType,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(announcementReactions)
      .where(inArray(announcementReactions.announcementId, announcementIds))
      .groupBy(
        announcementReactions.announcementId,
        announcementReactions.reactionType,
      )
      .execute();

    // Build reaction map
    const reactionMap = new Map<string, Record<string, number>>();
    reactionCount.forEach((r) => {
      if (!reactionMap.has(r.announcementId)) {
        reactionMap.set(r.announcementId, {});
      }
      reactionMap.get(r.announcementId)![r.reactionType] = r.count;
    });

    // Fetch comment counts
    const commentCount = await this.db
      .select({
        announcementId: announcementComments.announcementId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(announcementComments)
      .where(inArray(announcementComments.announcementId, announcementIds))
      .groupBy(announcementComments.announcementId)
      .execute();

    const commentCountMap = new Map<string, number>();
    commentCount.forEach((c) => {
      commentCountMap.set(c.announcementId, c.count);
    });

    // Return fully enriched object for frontend
    return allAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      reactionCounts: reactionMap.get(a.id) || {},
      commentCount: commentCountMap.get(a.id) || 0,
      publishedAt: a.publishedAt,
      createdBy: a.createdBy,
      avatarUrl: a.avatarUrl,
    }));
  }

  async findOne(id: string, userId: string) {
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
  }

  async update(id: string, dto: UpdateAnnouncementDto, user: User) {
    return this.db.transaction(async (tx) => {
      // Ensure the announcement exists
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

      // Log the update in the audit service
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

      return updatedAnnouncement;
    });
  }

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

      // Log the deletion in the audit service
      await this.auditService.logAction({
        action: 'delete',
        entity: 'announcement',
        entityId: id,
        userId: user.id,
        details: `Deleted announcement with title: ${announcement.title}`,
      });

      return { message: 'Announcement deleted successfully' };
    });
  }

  async getAllCreateElements(companyId: string) {
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
  }
}
