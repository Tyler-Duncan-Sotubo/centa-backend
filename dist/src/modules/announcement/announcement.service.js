"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const audit_service_1 = require("../audit/audit.service");
const announcements_schema_1 = require("./schema/announcements.schema");
const drizzle_orm_1 = require("drizzle-orm");
const comment_service_1 = require("./comment.service");
const reaction_service_1 = require("./reaction.service");
const aws_service_1 = require("../../common/aws/aws.service");
const schema_1 = require("../../drizzle/schema");
let AnnouncementService = class AnnouncementService {
    constructor(db, auditService, commentService, reactionService, awsService) {
        this.db = db;
        this.auditService = auditService;
        this.commentService = commentService;
        this.reactionService = reactionService;
        this.awsService = awsService;
    }
    create(dto, user) {
        return this.db.transaction(async (tx) => {
            const [existingAnnouncement] = await tx
                .select()
                .from(announcements_schema_1.announcements)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.title, dto.title))
                .limit(1)
                .execute();
            if (existingAnnouncement) {
                throw new common_1.BadRequestException('Announcement with this title already exists');
            }
            let image = dto.image;
            if (image?.startsWith('data:image')) {
                const fileName = `receipt-${Date.now()}.jpg`;
                image = await this.awsService.uploadImageToS3(user.companyId, fileName, image);
            }
            const [newAnnouncement] = await tx
                .insert(announcements_schema_1.announcements)
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
            return newAnnouncement;
        });
    }
    async findAll(companyId) {
        const allAnnouncements = await this.db
            .select({
            id: announcements_schema_1.announcements.id,
            title: announcements_schema_1.announcements.title,
            body: announcements_schema_1.announcements.body,
            publishedAt: announcements_schema_1.announcements.publishedAt,
            category: announcements_schema_1.announcementCategories.name,
            categoryId: announcements_schema_1.announcements.categoryId,
            createdBy: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`.as('createdBy'),
            role: schema_1.companyRoles.name,
            avatarUrl: schema_1.users.avatar,
        })
            .from(announcements_schema_1.announcements)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(announcements_schema_1.announcements.createdBy, schema_1.users.id))
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .leftJoin(announcements_schema_1.announcementCategories, (0, drizzle_orm_1.eq)(announcements_schema_1.announcements.categoryId, announcements_schema_1.announcementCategories.id))
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(announcements_schema_1.announcements.publishedAt))
            .limit(20)
            .execute();
        const announcementIds = allAnnouncements.map((a) => a.id);
        const reactionCount = await this.db
            .select({
            announcementId: announcements_schema_1.announcementReactions.announcementId,
            reactionType: announcements_schema_1.announcementReactions.reactionType,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
        })
            .from(announcements_schema_1.announcementReactions)
            .where((0, drizzle_orm_1.inArray)(announcements_schema_1.announcementReactions.announcementId, announcementIds))
            .groupBy(announcements_schema_1.announcementReactions.announcementId, announcements_schema_1.announcementReactions.reactionType)
            .execute();
        const reactionMap = new Map();
        reactionCount.forEach((r) => {
            if (!reactionMap.has(r.announcementId)) {
                reactionMap.set(r.announcementId, {});
            }
            reactionMap.get(r.announcementId)[r.reactionType] = r.count;
        });
        const commentCount = await this.db
            .select({
            announcementId: announcements_schema_1.announcementComments.announcementId,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
        })
            .from(announcements_schema_1.announcementComments)
            .where((0, drizzle_orm_1.inArray)(announcements_schema_1.announcementComments.announcementId, announcementIds))
            .groupBy(announcements_schema_1.announcementComments.announcementId)
            .execute();
        const commentCountMap = new Map();
        commentCount.forEach((c) => {
            commentCountMap.set(c.announcementId, c.count);
        });
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
    async findAllLimitTwo(companyId) {
        const allAnnouncements = await this.db
            .select({
            id: announcements_schema_1.announcements.id,
            title: announcements_schema_1.announcements.title,
            body: announcements_schema_1.announcements.body,
            publishedAt: announcements_schema_1.announcements.publishedAt,
            category: announcements_schema_1.announcementCategories.name,
            categoryId: announcements_schema_1.announcements.categoryId,
            createdBy: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`.as('createdBy'),
            role: schema_1.companyRoles.name,
            avatarUrl: schema_1.users.avatar,
        })
            .from(announcements_schema_1.announcements)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(announcements_schema_1.announcements.createdBy, schema_1.users.id))
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .leftJoin(announcements_schema_1.announcementCategories, (0, drizzle_orm_1.eq)(announcements_schema_1.announcements.categoryId, announcements_schema_1.announcementCategories.id))
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(announcements_schema_1.announcements.publishedAt))
            .limit(2)
            .execute();
        const announcementIds = allAnnouncements.map((a) => a.id);
        const reactionCount = await this.db
            .select({
            announcementId: announcements_schema_1.announcementReactions.announcementId,
            reactionType: announcements_schema_1.announcementReactions.reactionType,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
        })
            .from(announcements_schema_1.announcementReactions)
            .where((0, drizzle_orm_1.inArray)(announcements_schema_1.announcementReactions.announcementId, announcementIds))
            .groupBy(announcements_schema_1.announcementReactions.announcementId, announcements_schema_1.announcementReactions.reactionType)
            .execute();
        const reactionMap = new Map();
        reactionCount.forEach((r) => {
            if (!reactionMap.has(r.announcementId)) {
                reactionMap.set(r.announcementId, {});
            }
            reactionMap.get(r.announcementId)[r.reactionType] = r.count;
        });
        const commentCount = await this.db
            .select({
            announcementId: announcements_schema_1.announcementComments.announcementId,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
        })
            .from(announcements_schema_1.announcementComments)
            .where((0, drizzle_orm_1.inArray)(announcements_schema_1.announcementComments.announcementId, announcementIds))
            .groupBy(announcements_schema_1.announcementComments.announcementId)
            .execute();
        const commentCountMap = new Map();
        commentCount.forEach((c) => {
            commentCountMap.set(c.announcementId, c.count);
        });
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
    async findOne(id, userId) {
        const [announcement, likeCount, likedByCurrentUser, comments] = await Promise.all([
            this.db
                .select()
                .from(announcements_schema_1.announcements)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, id))
                .execute()
                .then(([res]) => {
                if (!res)
                    throw new common_1.BadRequestException(`Announcement with id ${id} not found`);
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
    async update(id, dto, user) {
        return this.db.transaction(async (tx) => {
            const [announcement] = await tx
                .select()
                .from(announcements_schema_1.announcements)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, id))
                .execute();
            if (!announcement) {
                throw new common_1.BadRequestException(`Announcement with id ${id} not found`);
            }
            const [updatedAnnouncement] = await tx
                .update(announcements_schema_1.announcements)
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
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, id))
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
            return updatedAnnouncement;
        });
    }
    remove(id, user) {
        return this.db.transaction(async (tx) => {
            const [announcement] = await tx
                .select()
                .from(announcements_schema_1.announcements)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, id))
                .execute();
            if (!announcement) {
                throw new common_1.BadRequestException(`Announcement with id ${id} not found`);
            }
            await tx.delete(announcements_schema_1.announcements).where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, id)).execute();
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
    async getAllCreateElements(companyId) {
        const [categories, allDepartments, AllLocations] = await Promise.all([
            this.db
                .select({
                id: announcements_schema_1.announcementCategories.id,
                name: announcements_schema_1.announcementCategories.name,
            })
                .from(announcements_schema_1.announcementCategories)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.companyId, companyId))
                .execute(),
            this.db
                .select({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
            })
                .from(schema_1.departments)
                .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
                .execute(),
            this.db
                .select({
                id: schema_1.companyLocations.id,
                name: schema_1.companyLocations.name,
            })
                .from(schema_1.companyLocations)
                .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId))
                .execute(),
        ]);
        return {
            categories,
            departments: allDepartments,
            locations: AllLocations,
        };
    }
};
exports.AnnouncementService = AnnouncementService;
exports.AnnouncementService = AnnouncementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        comment_service_1.CommentService,
        reaction_service_1.ReactionService,
        aws_service_1.AwsService])
], AnnouncementService);
//# sourceMappingURL=announcement.service.js.map