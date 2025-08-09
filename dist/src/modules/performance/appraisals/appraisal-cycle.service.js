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
var AppraisalCycleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppraisalCycleService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const performance_appraisal_cycle_schema_1 = require("./schema/performance-appraisal-cycle.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let AppraisalCycleService = AppraisalCycleService_1 = class AppraisalCycleService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(AppraisalCycleService_1.name);
    }
    oneKey(companyId, id) {
        return `appraisalcycle:${companyId}:one:${id}`;
    }
    listKey(companyId) {
        return `appraisalcycle:${companyId}:list`;
    }
    currentKey(companyId) {
        return `appraisalcycle:${companyId}:current`;
    }
    lastKey(companyId) {
        return `appraisalcycle:${companyId}:last`;
    }
    async burst(opts) {
        const jobs = [];
        jobs.push(this.cache.del(this.listKey(opts.companyId)));
        jobs.push(this.cache.del(this.currentKey(opts.companyId)));
        jobs.push(this.cache.del(this.lastKey(opts.companyId)));
        if (opts.id)
            jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:appraisal-cycles');
    }
    async create(createDto, companyId, userId) {
        this.logger.info({ companyId, name: createDto.name }, 'cycle:create:start');
        const existing = await this.db
            .select()
            .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name, createDto.name), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId, name: createDto.name }, 'cycle:create:duplicate');
            throw new common_1.BadRequestException('Appraisal cycle name already exists');
        }
        const [created] = await this.db
            .insert(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .values({
            ...createDto,
            startDate: createDto.startDate,
            endDate: createDto.endDate,
            companyId,
        })
            .returning()
            .execute();
        if (userId) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'performance_appraisal_cycle',
                entityId: created.id,
                userId,
                details: `Created appraisal cycle ${created.name}`,
                changes: {
                    name: created.name,
                    companyId,
                    startDate: created.startDate,
                    endDate: created.endDate,
                    status: created.status,
                },
            });
        }
        await this.burst({ companyId });
        this.logger.info({ id: created.id }, 'cycle:create:done');
        return created;
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'cycle:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.asc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                .execute();
            const today = new Date().toISOString();
            const currentCycle = rows.find((c) => c.startDate <= today &&
                c.endDate >= today &&
                c.companyId === companyId);
            const out = rows.map((cycle) => ({
                ...cycle,
                status: cycle.id === currentCycle?.id ? 'active' : 'upcoming',
            }));
            this.logger.debug({ companyId, count: out.length }, 'cycle:list:db:done');
            return out;
        });
    }
    async getLastCycle(companyId) {
        const key = this.lastKey(companyId);
        this.logger.debug({ key, companyId }, 'cycle:last:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [lastCycle] = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                .limit(1)
                .execute();
            return lastCycle ?? null;
        });
    }
    async findCurrent(companyId) {
        const key = this.currentKey(companyId);
        this.logger.debug({ key, companyId }, 'cycle:current:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const today = new Date().toISOString();
            const current = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId), (0, drizzle_orm_1.lte)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate, today), (0, drizzle_orm_1.gte)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.endDate, today)))
                .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                .limit(1)
                .execute();
            return current[0] ?? null;
        });
    }
    async findOne(id, companyId) {
        const key = this.oneKey(companyId, id);
        this.logger.debug({ key, id, companyId }, 'cycle:one:cache:get');
        const cycle = await this.cache.getOrSetCache(key, async () => {
            const [row] = await this.db
                .select()
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, id), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId)))
                .execute();
            return row ?? null;
        });
        if (!cycle) {
            this.logger.warn({ id, companyId }, 'cycle:one:not-found');
            throw new common_1.NotFoundException(`Appraisal cycle with ID ${id} not found`);
        }
        const today = new Date().toISOString();
        const isActive = cycle.startDate <= today && cycle.endDate >= today;
        return { ...cycle, status: isActive ? 'active' : 'upcoming' };
    }
    async getLast(companyId) {
        return this.getLastCycle(companyId);
    }
    async update(id, updateDto, user) {
        this.logger.info({ id, userId: user.id }, 'cycle:update:start');
        await this.findOne(id, user.companyId);
        const [updated] = await this.db
            .update(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .set({
            ...updateDto,
            startDate: updateDto.startDate,
            endDate: updateDto.endDate,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, id), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_appraisal_cycle',
            entityId: id,
            userId: user.id,
            details: `Updated appraisal cycle ${updated.name}`,
            changes: {
                ...updateDto,
                updatedAt: new Date().toISOString(),
            },
        });
        await this.burst({ companyId: user.companyId, id });
        this.logger.info({ id }, 'cycle:update:done');
        return updated;
    }
    async remove(id, user) {
        const { companyId, id: userId } = user;
        this.logger.info({ id, userId }, 'cycle:remove:start');
        await this.findOne(id, companyId);
        await this.db
            .delete(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, id), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_appraisal_cycle',
            entityId: id,
            userId,
            details: `Deleted appraisal cycle ${id}`,
            changes: {
                deletedAt: new Date().toISOString(),
            },
        });
        await this.burst({ companyId, id });
        this.logger.info({ id }, 'cycle:remove:done');
        return { message: 'Cycle deleted successfully' };
    }
};
exports.AppraisalCycleService = AppraisalCycleService;
exports.AppraisalCycleService = AppraisalCycleService = AppraisalCycleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], AppraisalCycleService);
//# sourceMappingURL=appraisal-cycle.service.js.map