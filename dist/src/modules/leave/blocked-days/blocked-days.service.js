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
exports.BlockedDaysService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const blocked_day_schema_1 = require("./schema/blocked-day.schema");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let BlockedDaysService = class BlockedDaysService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(companyId) {
        return [
            `company:${companyId}:leave`,
            `company:${companyId}:leave:blocked-days`,
        ];
    }
    async create(dto, user) {
        const existingBlockedDay = await this.db
            .select()
            .from(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.date, dto.date), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId)))
            .execute();
        if (existingBlockedDay.length > 0) {
            throw new common_1.BadRequestException('This date is already blocked.');
        }
        const [blockedDay] = await this.db
            .insert(blocked_day_schema_1.blockedLeaveDays)
            .values({
            ...dto,
            companyId: user.companyId,
            createdBy: user.id,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'blockedLeaveDays',
            entityId: blockedDay.id,
            userId: user.id,
            details: 'Blocked day created',
            changes: { ...dto, companyId: user.companyId },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return blockedDay;
    }
    async getBlockedDates(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'blocked-days', 'dates'], async () => {
            const result = (await this.db
                .select({ date: blocked_day_schema_1.blockedLeaveDays.date })
                .from(blocked_day_schema_1.blockedLeaveDays)
                .where((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, companyId))
                .execute());
            return result.map((r) => (typeof r.date === 'string' ? r.date : r.date.toISOString()).split('T')[0]);
        }, { tags: this.tags(companyId) });
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'blocked-days', 'list'], async () => {
            return this.db
                .select({
                id: blocked_day_schema_1.blockedLeaveDays.id,
                date: blocked_day_schema_1.blockedLeaveDays.date,
                reason: blocked_day_schema_1.blockedLeaveDays.reason,
                createdAt: blocked_day_schema_1.blockedLeaveDays.createdAt,
                createdBy: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
                name: blocked_day_schema_1.blockedLeaveDays.name,
            })
                .from(blocked_day_schema_1.blockedLeaveDays)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, blocked_day_schema_1.blockedLeaveDays.createdBy))
                .where((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, companyId))
                .execute();
        }, { tags: this.tags(companyId) });
    }
    async findOne(id, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'blocked-days', 'one', id], async () => {
            const [blockedDay] = await this.db
                .select()
                .from(blocked_day_schema_1.blockedLeaveDays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, companyId)))
                .execute();
            if (!blockedDay) {
                throw new common_1.NotFoundException('Blocked day not found');
            }
            return blockedDay;
        }, { tags: this.tags(companyId) });
    }
    async update(id, dto, user) {
        const [existing] = await this.db
            .select()
            .from(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId)))
            .execute();
        if (!existing)
            throw new common_1.NotFoundException('Blocked day not found');
        const [updated] = await this.db
            .update(blocked_day_schema_1.blockedLeaveDays)
            .set(dto)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'blockedLeaveDays',
            entityId: id,
            userId: user.id,
            details: 'Blocked day updated',
            changes: { before: existing, after: updated },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return updated;
    }
    async remove(id, user) {
        const [existing] = await this.db
            .select()
            .from(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId)))
            .execute();
        if (!existing)
            throw new common_1.NotFoundException('Blocked day not found');
        await this.db
            .delete(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'blockedLeaveDays',
            entityId: id,
            userId: user.id,
            details: 'Blocked day deleted',
            changes: { id, companyId: user.companyId },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return { message: 'Blocked day deleted successfully' };
    }
};
exports.BlockedDaysService = BlockedDaysService;
exports.BlockedDaysService = BlockedDaysService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], BlockedDaysService);
//# sourceMappingURL=blocked-days.service.js.map