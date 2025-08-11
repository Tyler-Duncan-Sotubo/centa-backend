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
var CycleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CycleService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_cycles_schema_1 = require("./schema/performance-cycles.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let CycleService = CycleService_1 = class CycleService {
    constructor(auditService, db, logger, cache) {
        this.auditService = auditService;
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(CycleService_1.name);
    }
    listKey(companyId) {
        return `pc:${companyId}:list`;
    }
    currentKey(companyId) {
        return `pc:${companyId}:current`;
    }
    lastKey(companyId) {
        return `pc:${companyId}:last`;
    }
    oneKey(id) {
        return `pc:id:${id}`;
    }
    async burstCache(opts) {
        const jobs = [];
        if (opts.companyId) {
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
            jobs.push(this.cache.del(this.currentKey(opts.companyId)));
            jobs.push(this.cache.del(this.lastKey(opts.companyId)));
        }
        if (opts.id)
            jobs.push(this.cache.del(this.oneKey(opts.id)));
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'cycle:cache:burst');
    }
    async create(createCycleDto, companyId, userId) {
        this.logger.info({ companyId, createCycleDto }, 'cycle:create:start');
        const existingCycle = await this.db
            .select()
            .from(performance_cycles_schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.name, createCycleDto.name), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
            .execute();
        if (existingCycle.length > 0) {
            this.logger.warn({ companyId, name: createCycleDto.name }, 'cycle:create:duplicate-name');
            throw new common_1.BadRequestException('Cycle with this name already exists');
        }
        const today = new Date();
        const startDate = new Date(createCycleDto.startDate);
        const endDate = new Date(createCycleDto.endDate);
        if (endDate < startDate) {
            this.logger.warn({ startDate, endDate }, 'cycle:create:bad-dates');
            throw new common_1.BadRequestException('End date must be after start date');
        }
        const status = startDate <= today || endDate <= today ? 'active' : 'draft';
        const [newCycle] = await this.db
            .insert(performance_cycles_schema_1.performanceCycles)
            .values({
            ...createCycleDto,
            status,
            companyId,
        })
            .returning();
        if (userId) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'performance_cycle',
                entityId: newCycle.id,
                userId,
                details: `Created performance cycle ${newCycle.name}`,
                changes: {
                    name: newCycle.name,
                    companyId,
                    startDate: newCycle.startDate,
                    endDate: newCycle.endDate,
                    status: newCycle.status,
                },
            });
        }
        await this.burstCache({ companyId, id: newCycle.id });
        this.logger.info({ id: newCycle.id }, 'cycle:create:done');
        return newCycle;
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'cycle:findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const cycles = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(performance_cycles_schema_1.performanceCycles.startDate))
                .execute();
            this.logger.debug({ companyId, count: cycles.length }, 'cycle:findAll:db:done');
            return cycles;
        });
    }
    async findCurrent(companyId) {
        const key = this.currentKey(companyId);
        this.logger.debug({ companyId, key }, 'cycle:findCurrent:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const today = new Date();
            const todayStr = today.toISOString().slice(0, 10);
            const currentCycle = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId), (0, drizzle_orm_1.lte)(performance_cycles_schema_1.performanceCycles.startDate, todayStr), (0, drizzle_orm_1.gte)(performance_cycles_schema_1.performanceCycles.endDate, todayStr)))
                .orderBy((0, drizzle_orm_1.desc)(performance_cycles_schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            const curr = currentCycle[0] ?? null;
            this.logger.debug({ companyId, found: Boolean(curr) }, 'cycle:findCurrent:db:done');
            return curr;
        });
    }
    async findOne(id) {
        const key = this.oneKey(id);
        this.logger.debug({ id, key }, 'cycle:findOne:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [cycle] = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id))
                .execute();
            if (!cycle) {
                this.logger.warn({ id }, 'cycle:findOne:not-found');
                throw new common_1.NotFoundException(`Performance cycle with ID ${id} not found.`);
            }
            return cycle;
        });
    }
    async getLastCycle(companyId) {
        const key = this.lastKey(companyId);
        this.logger.debug({ companyId, key }, 'cycle:getLast:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [lastCycle] = await this.db
                .select()
                .from(performance_cycles_schema_1.performanceCycles)
                .where((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(performance_cycles_schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            this.logger.debug({ companyId, found: Boolean(lastCycle) }, 'cycle:getLast:db:done');
            return lastCycle ?? null;
        });
    }
    async update(id, updateCycleDto, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ id, userId, updateCycleDto }, 'cycle:update:start');
        await this.findOne(id);
        const [updatedCycle] = await this.db
            .update(performance_cycles_schema_1.performanceCycles)
            .set(updateCycleDto)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_cycle',
            entityId: id,
            userId,
            details: `Updated performance cycle ${updatedCycle.name}`,
            changes: {
                ...updateCycleDto,
                id: updatedCycle.id,
                companyId: updatedCycle.companyId,
                startDate: updatedCycle.startDate,
                endDate: updatedCycle.endDate,
                status: updatedCycle.status,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
            },
        });
        await this.burstCache({ companyId, id });
        this.logger.info({ id }, 'cycle:update:done');
        return updatedCycle;
    }
    async remove(id, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ id, userId, companyId }, 'cycle:remove:start');
        await this.findOne(id);
        await this.db
            .delete(performance_cycles_schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.id, id), (0, drizzle_orm_1.eq)(performance_cycles_schema_1.performanceCycles.companyId, companyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_cycle',
            entityId: id,
            userId,
            details: `Deleted performance cycle with ID ${id}`,
            changes: {
                id,
                companyId,
                status: 'deleted',
                deletedAt: new Date().toISOString(),
                deletedBy: userId,
            },
        });
        await this.burstCache({ companyId, id });
        this.logger.info({ id }, 'cycle:remove:done');
    }
};
exports.CycleService = CycleService;
exports.CycleService = CycleService = CycleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], CycleService);
//# sourceMappingURL=cycle.service.js.map