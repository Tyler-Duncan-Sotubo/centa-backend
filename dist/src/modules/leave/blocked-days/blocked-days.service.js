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
var BlockedDaysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedDaysService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const blocked_day_schema_1 = require("./schema/blocked-day.schema");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let BlockedDaysService = BlockedDaysService_1 = class BlockedDaysService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(BlockedDaysService_1.name);
    }
    listKey(companyId) {
        return `company:${companyId}:blockedDays:list`;
    }
    datesKey(companyId) {
        return `company:${companyId}:blockedDays:dates`;
    }
    oneKey(id) {
        return `blockedDay:${id}:detail`;
    }
    async burst(companyId, id) {
        const jobs = [
            this.cache.del(this.listKey(companyId)),
            this.cache.del(this.datesKey(companyId)),
        ];
        if (id)
            jobs.push(this.cache.del(this.oneKey(id)));
        await Promise.allSettled(jobs);
        this.logger.debug({ companyId, id }, 'cache:burst:blocked-days');
    }
    async create(dto, user) {
        this.logger.info({ companyId: user.companyId, dto }, 'blockedDay:create:start');
        const exists = await this.db
            .select({ id: blocked_day_schema_1.blockedLeaveDays.id })
            .from(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.date, dto.date)))
            .execute();
        if (exists.length > 0) {
            this.logger.warn({ date: dto.date, companyId: user.companyId }, 'blockedDay:create:duplicate');
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
            changes: dto,
        });
        await this.burst(user.companyId, blockedDay.id);
        this.logger.info({ id: blockedDay.id }, 'blockedDay:create:done');
        return blockedDay;
    }
    async getBlockedDates(companyId) {
        const key = this.datesKey(companyId);
        this.logger.debug({ companyId, key }, 'blockedDay:dates:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const result = await this.db
                .select({ date: blocked_day_schema_1.blockedLeaveDays.date })
                .from(blocked_day_schema_1.blockedLeaveDays)
                .where((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, companyId))
                .execute();
            const out = result.map((r) => (r.date instanceof Date
                ? r.date.toISOString()
                : String(r.date)).split('T')[0]);
            this.logger.debug({ companyId, count: out.length }, 'blockedDay:dates:db:done');
            return out;
        });
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'blockedDay:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
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
            this.logger.debug({ companyId, count: rows.length }, 'blockedDay:list:db:done');
            return rows;
        });
    }
    async findOne(id) {
        const key = this.oneKey(id);
        this.logger.debug({ id, key }, 'blockedDay:one:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [blockedDay] = await this.db
                .select()
                .from(blocked_day_schema_1.blockedLeaveDays)
                .where((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id))
                .execute();
            return blockedDay ?? null;
        });
        if (!row) {
            this.logger.warn({ id }, 'blockedDay:one:not-found');
            throw new common_1.NotFoundException('Blocked day not found');
        }
        return row;
    }
    async update(id, dto, user) {
        this.logger.info({ id, companyId: user.companyId, dto }, 'blockedDay:update:start');
        const [existing] = await this.db
            .select()
            .from(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id), (0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.companyId, user.companyId)))
            .execute();
        if (!existing) {
            this.logger.warn({ id, companyId: user.companyId }, 'blockedDay:update:not-found');
            throw new common_1.NotFoundException('Blocked day not found');
        }
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
            changes: dto,
        });
        await this.burst(user.companyId, id);
        this.logger.info({ id }, 'blockedDay:update:done');
        return updated;
    }
    async remove(id, user) {
        this.logger.info({ id, companyId: user?.companyId }, 'blockedDay:remove:start');
        const [existing] = await this.db
            .select({ companyId: blocked_day_schema_1.blockedLeaveDays.companyId })
            .from(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id))
            .execute();
        if (!existing) {
            this.logger.warn({ id }, 'blockedDay:remove:not-found');
            throw new common_1.NotFoundException('Blocked day not found');
        }
        await this.db
            .delete(blocked_day_schema_1.blockedLeaveDays)
            .where((0, drizzle_orm_1.eq)(blocked_day_schema_1.blockedLeaveDays.id, id))
            .execute();
        if (user) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'blockedLeaveDays',
                entityId: id,
                userId: user?.id,
                details: 'Blocked day deleted',
                changes: {},
            });
        }
        if (!existing.companyId) {
            this.logger.error({ id }, 'blockedDay:remove:missing-companyId');
            throw new common_1.NotFoundException('Blocked day companyId not found');
        }
        await this.burst(existing.companyId, id);
        this.logger.info({ id }, 'blockedDay:remove:done');
        return { success: true };
    }
};
exports.BlockedDaysService = BlockedDaysService;
exports.BlockedDaysService = BlockedDaysService = BlockedDaysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], BlockedDaysService);
//# sourceMappingURL=blocked-days.service.js.map