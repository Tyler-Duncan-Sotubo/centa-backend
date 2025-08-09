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
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const audit_service_1 = require("../audit/audit.service");
const announcements_schema_1 = require("./schema/announcements.schema");
const cache_service_1 = require("../../common/cache/cache.service");
const reaction_types_1 = require("./types/reaction-types");
let ReactionService = class ReactionService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    reactionsCacheKey(announcementId) {
        return `announcement:${announcementId}:reactions`;
    }
    reactionCountsKey(announcementId) {
        return `announcement:${announcementId}:reaction-counts`;
    }
    async reactToAnnouncement(announcementId, reactionType, user) {
        if (!reaction_types_1.REACTION_TYPES.includes(reactionType)) {
            throw new common_1.BadRequestException('Invalid reaction type');
        }
        const [announcement] = await this.db
            .select({ id: announcements_schema_1.announcements.id })
            .from(announcements_schema_1.announcements)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcements.id, announcementId))
            .limit(1)
            .execute();
        if (!announcement) {
            throw new common_1.BadRequestException('Announcement not found');
        }
        return this.db.transaction(async (tx) => {
            const [existingSameType] = await tx
                .select({ id: announcements_schema_1.announcementReactions.id })
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.createdBy, user.id), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.reactionType, reactionType)))
                .limit(1)
                .execute();
            if (existingSameType) {
                await tx
                    .delete(announcements_schema_1.announcementReactions)
                    .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.id, existingSameType.id))
                    .execute();
                await this.auditService.logAction({
                    action: 'reaction_removed',
                    entity: 'announcement',
                    entityId: announcementId,
                    userId: user.id,
                    details: `User ${user.id} un-reacted (${reactionType}) on announcement ${announcementId}`,
                    changes: { id: existingSameType.id, reactionType },
                });
            }
            else {
                const [inserted] = await tx
                    .insert(announcements_schema_1.announcementReactions)
                    .values({
                    announcementId,
                    createdBy: user.id,
                    reactionType,
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
            await Promise.allSettled([
                this.cache.del(this.reactionsCacheKey(announcementId)),
                this.cache.del(this.reactionCountsKey(announcementId)),
            ]);
            const [fresh] = await tx
                .select()
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.createdBy, user.id), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.reactionType, reactionType)))
                .execute();
            return fresh ?? null;
        });
    }
    async getReactions(announcementId) {
        const cacheKey = this.reactionsCacheKey(announcementId);
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select()
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId))
                .orderBy((0, drizzle_orm_1.desc)(announcements_schema_1.announcementReactions.createdAt))
                .execute();
        });
    }
    async countReactionsByType(announcementId) {
        const cacheKey = this.reactionCountsKey(announcementId);
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select({
                reactionType: announcements_schema_1.announcementReactions.reactionType,
                count: (0, drizzle_orm_1.sql) `COUNT(*)`.as('count'),
            })
                .from(announcements_schema_1.announcementReactions)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId))
                .groupBy(announcements_schema_1.announcementReactions.reactionType)
                .execute();
        });
    }
    async hasUserReacted(announcementId, userId) {
        const [reaction] = await this.db
            .select({ id: announcements_schema_1.announcementReactions.id })
            .from(announcements_schema_1.announcementReactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.announcementId, announcementId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementReactions.createdBy, userId)))
            .limit(1)
            .execute();
        return !!reaction;
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