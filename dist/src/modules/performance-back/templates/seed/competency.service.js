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
var PerformanceCompetencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceCompetencyService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_competencies_schema_1 = require("../schema/performance-competencies.schema");
const audit_service_1 = require("../../../audit/audit.service");
const defaults_1 = require("./defaults");
const performance_review_questions_schema_1 = require("../schema/performance-review-questions.schema");
const performance_competency_levels_schema_1 = require("../schema/performance-competency-levels.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let PerformanceCompetencyService = PerformanceCompetencyService_1 = class PerformanceCompetencyService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(PerformanceCompetencyService_1.name);
    }
    onlyListKey(companyId) {
        return `pcmp:${companyId}:only`;
    }
    withQListKey(companyId) {
        return `pcmp:${companyId}:withq`;
    }
    oneKey(companyId, id) {
        return `pcmp:${companyId}:one:${id}`;
    }
    levelsKey() {
        return `pcmp:levels`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId) {
            jobs.push(this.cache.del(this.onlyListKey(opts.companyId)));
            jobs.push(this.cache.del(this.withQListKey(opts.companyId)));
            if (opts.competencyId)
                jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.competencyId)));
        }
        if (opts.levels) {
            jobs.push(this.cache.del(this.levelsKey()));
        }
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'competency:cache:burst');
    }
    async create(companyId, dto, userId) {
        this.logger.info({ companyId, dto, userId }, 'competency:create:start');
        const whereClause = companyId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, dto.name), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, dto.name), (0, drizzle_orm_1.isNull)(performance_competencies_schema_1.performanceCompetencies.companyId));
        const existing = await this.db
            .select()
            .from(performance_competencies_schema_1.performanceCompetencies)
            .where(whereClause);
        if (existing.length > 0) {
            this.logger.warn({ companyId, name: dto.name }, 'competency:create:duplicate');
            throw new common_1.BadRequestException('Competency already exists for this company');
        }
        const [created] = await this.db
            .insert(performance_competencies_schema_1.performanceCompetencies)
            .values({
            companyId,
            name: dto.name,
            description: dto.description,
            isGlobal: !companyId,
            isActive: true,
            createdAt: new Date(),
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'performance_competency',
            entityId: created.id,
            userId,
            details: `Created competency: ${created.name}`,
            changes: { name: created.name, description: created.description },
        });
        if (companyId)
            await this.burst({ companyId, competencyId: created.id });
        this.logger.info({ id: created.id }, 'competency:create:done');
        return created;
    }
    async update(id, user, data) {
        this.logger.info({ id, userId: user.id, data }, 'competency:update:start');
        const { companyId, id: userId } = user;
        const competency = await this.getById(id, companyId);
        const [updated] = await this.db
            .update(performance_competencies_schema_1.performanceCompetencies)
            .set({ ...data })
            .where((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_competency',
            entityId: id,
            userId,
            details: `Updated competency: ${competency.name}`,
            changes: {
                name: data.name ?? competency.name,
                description: data.description ?? competency.description,
            },
        });
        await this.burst({ companyId, competencyId: id });
        this.logger.info({ id }, 'competency:update:done');
        return updated;
    }
    async delete(id, user) {
        this.logger.info({ id, userId: user.id }, 'competency:delete:start');
        const { companyId, id: userId } = user;
        const competency = await this.getById(id, companyId);
        await this.db
            .delete(performance_competencies_schema_1.performanceCompetencies)
            .where((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_competency',
            entityId: id,
            userId,
            details: `Deleted competency: ${competency.name}`,
        });
        await this.burst({ companyId, competencyId: id });
        this.logger.info({ id }, 'competency:delete:done');
        return { message: 'Deleted successfully' };
    }
    async seedGlobalCompetencies() {
        this.logger.info({}, 'competency:seedGlobals:start');
        for (const comp of defaults_1.competencies) {
            const existing = await this.db
                .select()
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, comp.name), (0, drizzle_orm_1.isNull)(performance_competencies_schema_1.performanceCompetencies.companyId)));
            if (existing.length === 0) {
                await this.db.insert(performance_competencies_schema_1.performanceCompetencies).values({
                    name: comp.name,
                    description: comp.description,
                    isActive: true,
                    isGlobal: true,
                    companyId: null,
                    createdAt: new Date(),
                });
            }
        }
        this.logger.info({ count: defaults_1.competencies.length }, 'competency:seedGlobals:done');
        return {
            message: `${defaults_1.competencies.length} global competencies seeded.`,
        };
    }
    async seedSystemLevels() {
        this.logger.info({}, 'competency:seedLevels:start');
        const defaultLevels = [
            { name: 'Beginner', weight: 1 },
            { name: 'Intermediate', weight: 2 },
            { name: 'Advanced', weight: 3 },
            { name: 'Proficient', weight: 4 },
            { name: 'Expert / Leader', weight: 5 },
        ];
        for (const level of defaultLevels) {
            const exists = await this.db
                .select()
                .from(performance_competency_levels_schema_1.competencyLevels)
                .where((0, drizzle_orm_1.eq)(performance_competency_levels_schema_1.competencyLevels.name, level.name));
            if (exists.length === 0) {
                await this.db.insert(performance_competency_levels_schema_1.competencyLevels).values(level);
            }
        }
        await this.burst({ levels: true });
        this.logger.info({}, 'competency:seedLevels:done');
        return { message: 'System competency levels seeded successfully.' };
    }
    async getOnlyCompetencies(companyId) {
        const key = this.onlyListKey(companyId);
        this.logger.debug({ companyId, key }, 'competency:getOnly:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: performance_competencies_schema_1.performanceCompetencies.id,
                name: performance_competencies_schema_1.performanceCompetencies.name,
            })
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
            this.logger.debug({ companyId, count: rows.length }, 'competency:getOnly:db:done');
            return rows;
        });
    }
    async getCompetenciesWithQuestions(companyId) {
        const key = this.withQListKey(companyId);
        this.logger.debug({ companyId, key }, 'competency:getWithQ:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const comps = await this.db
                .select()
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
            const ids = comps.map((c) => c.id);
            if (ids.length === 0)
                return [];
            const questions = await this.db
                .select()
                .from(performance_review_questions_schema_1.performanceReviewQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(performance_review_questions_schema_1.performanceReviewQuestions.competencyId, ids), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isActive, true)));
            const grouped = comps.map((comp) => ({
                ...comp,
                questions: questions.filter((q) => q.competencyId === comp.id),
            }));
            this.logger.debug({ companyId, count: grouped.length }, 'competency:getWithQ:db:done');
            return grouped;
        });
    }
    async getById(id, companyId) {
        const key = this.oneKey(companyId, id);
        this.logger.debug({ companyId, id, key }, 'competency:getById:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [competency] = await this.db
                .select()
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.companyId, companyId), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true))));
            if (!competency) {
                this.logger.warn({ id, companyId }, 'competency:getById:not-found');
                throw new common_1.NotFoundException('Competency not found');
            }
            if (!competency.isGlobal && competency.companyId !== companyId) {
                this.logger.warn({ id, companyId }, 'competency:getById:forbidden');
                throw new common_1.NotFoundException('Access denied');
            }
            return competency;
        });
    }
    async getAllCompetencyLevels() {
        const key = this.levelsKey();
        this.logger.debug({ key }, 'competency:getLevels:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const levels = await this.db
                .select()
                .from(performance_competency_levels_schema_1.competencyLevels)
                .orderBy(performance_competency_levels_schema_1.competencyLevels.weight);
            this.logger.debug({ count: levels.length }, 'competency:getLevels:db:done');
            return levels;
        });
    }
};
exports.PerformanceCompetencyService = PerformanceCompetencyService;
exports.PerformanceCompetencyService = PerformanceCompetencyService = PerformanceCompetencyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], PerformanceCompetencyService);
//# sourceMappingURL=competency.service.js.map