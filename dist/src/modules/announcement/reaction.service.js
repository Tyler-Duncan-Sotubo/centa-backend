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
exports.ReactionService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const audit_service_1 = require("../audit/audit.service");
const announcements_schema_1 = require("./schema/announcements.schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../common/cache/cache.service");
let ReactionService = class ReactionService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(companyId, announcementId) {
        return [
            `company:${companyId}:announcements`,
            `company:${companyId}:announcement:${announcementId}:reactions`,
        ];
    }
    async getCompanyIdForAnnouncement(announcementId) {
        const [row] = await this.db
            .select({ companyId: announcements_schema_1.announcements.companyId })
            .from(announcements_schema_1.announcements)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, announcementId))
            .execute();
        if (!row)
            throw new common_1.BadRequestException('Announcement not found');
        return row.companyId;
    }
    async reactToAnnouncement(announcementId, reactionType, user) {
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
            throw new common_1.BadRequestException('Invalid reaction type');
        }
        const [announcement] = await this.db
            .select()
            .from(announcements_schema_1.announcements)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, announcementId))
            .execute();
        if (!announcement) {
            throw new common_1.BadRequestException('Announcement not found');
        }
        const [existingReaction] = await this.db
            .select()
            .from(announcements_schema_1.announcementReactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.createdBy, user.id), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.reactionType, reactionType)))
            .execute();
        let result = { toggledOff: false };
        if (existingReaction) {
            await this.db
                .delete(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.id, existingReaction.id))
                .execute();
            result = { toggledOff: true };
        }
        else {
            const [newReaction] = await this.db
                .insert(announcements_schema_1.announcementReactions)
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
        await this.cache.bumpCompanyVersion(announcement.companyId);
        return result;
    }
    async getReactions(announcementId) {
        const companyId = await this.getCompanyIdForAnnouncement(announcementId);
        return this.cache.getOrSetVersioned(companyId, ['announcement', announcementId, 'reactions', 'list'], async () => {
            return this.db
                .select()
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId))
                .orderBy((0, drizzle_orm_1.desc)(announcements_schema_1.announcementReactions.createdAt))
                .execute();
        }, {
            tags: this.tags(companyId, announcementId),
        });
    }
    async countReactionsByType(announcementId) {
        const companyId = await this.getCompanyIdForAnnouncement(announcementId);
        return this.cache.getOrSetVersioned(companyId, ['announcement', announcementId, 'reactions', 'counts'], async () => {
            return this.db
                .select({
                reactionType: announcements_schema_1.announcementReactions.reactionType,
                count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
            })
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId))
                .groupBy(announcements_schema_1.announcementReactions.reactionType)
                .execute();
        }, {
            tags: this.tags(companyId, announcementId),
        });
    }
    async hasUserReacted(announcementId, userId) {
        const companyId = await this.getCompanyIdForAnnouncement(announcementId);
        return this.cache.getOrSetVersioned(companyId, ['announcement', announcementId, 'reactions', 'hasUser', userId], async () => {
            const [reaction] = await this.db
                .select({ id: announcements_schema_1.announcementReactions.id })
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.createdBy, userId)))
                .limit(1)
                .execute();
            return !!reaction;
        }, {
            tags: this.tags(companyId, announcementId),
        });
    }
};
exports.ReactionService = ReactionService;
exports.ReactionService = ReactionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], ReactionService);
//# sourceMappingURL=reaction.service.js.map