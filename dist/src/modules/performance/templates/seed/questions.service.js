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
var PerformanceReviewQuestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceReviewQuestionService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_review_questions_schema_1 = require("../schema/performance-review-questions.schema");
const audit_service_1 = require("../../../audit/audit.service");
const performance_competencies_schema_1 = require("../schema/performance-competencies.schema");
const defaults_1 = require("./defaults");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let PerformanceReviewQuestionService = PerformanceReviewQuestionService_1 = class PerformanceReviewQuestionService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(PerformanceReviewQuestionService_1.name);
    }
    listKey(companyId) {
        return `prq:${companyId}:list`;
    }
    oneKey(companyId, id) {
        return `prq:${companyId}:one:${id}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId) {
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
            if (opts.id)
                jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'prq:cache:burst');
    }
    async ensureCompanyOwned(id, companyId) {
        const [row] = await this.db
            .select()
            .from(performance_review_questions_schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isGlobal, false)));
        if (!row) {
            this.logger.warn({ id, companyId }, 'prq:ensureCompanyOwned:not-owned-or-missing');
            throw new common_1.ForbiddenException('Only company questions can be modified');
        }
        return row;
    }
    async create(user, dto) {
        this.logger.info({ userId: user.id, companyId: user.companyId }, 'prq:create:start');
        const [created] = await this.db
            .insert(performance_review_questions_schema_1.performanceReviewQuestions)
            .values({
            companyId: user.companyId,
            question: dto.question,
            type: dto.type,
            competencyId: dto.competencyId,
            isMandatory: dto.isMandatory ?? false,
            allowNotes: dto.allowNotes ?? false,
            isActive: true,
            isGlobal: false,
            createdAt: new Date(),
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'performance_review_question',
            entityId: created.id,
            userId: user.id,
            details: `Created question: ${created.question}`,
        });
        await this.burst({ companyId: user.companyId, id: created.id });
        this.logger.info({ id: created.id }, 'prq:create:done');
        return created;
    }
    async update(id, user, dto) {
        this.logger.info({ id, userId: user.id }, 'prq:update:start');
        await this.ensureCompanyOwned(id, user.companyId);
        const [updated] = await this.db
            .update(performance_review_questions_schema_1.performanceReviewQuestions)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_review_question',
            entityId: id,
            userId: user.id,
            details: `Updated question: ${dto.question ?? updated.question}`,
            changes: {
                question: dto.question,
                type: dto.type,
                competencyId: dto.competencyId,
                isMandatory: dto.isMandatory,
                allowNotes: dto.allowNotes,
            },
        });
        await this.burst({ companyId: user.companyId, id });
        this.logger.info({ id }, 'prq:update:done');
        return updated;
    }
    async delete(id, user) {
        this.logger.info({ id, userId: user.id }, 'prq:delete:start');
        const question = await this.ensureCompanyOwned(id, user.companyId);
        await this.db
            .delete(performance_review_questions_schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_review_question',
            entityId: id,
            userId: user.id,
            details: `Deleted question: ${question.question}`,
        });
        await this.burst({ companyId: user.companyId, id });
        this.logger.info({ id }, 'prq:delete:done');
        return { message: 'Deleted successfully' };
    }
    async seedGlobalReviewQuestions() {
        this.logger.info({}, 'prq:seedGlobals:start');
        for (const entry of defaults_1.questions) {
            const [competency] = await this.db
                .select()
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, entry.competency), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true), (0, drizzle_orm_1.isNull)(performance_competencies_schema_1.performanceCompetencies.companyId)));
            if (!competency) {
                this.logger.warn({ competency: entry.competency }, 'prq:seedGlobals:competency-missing');
                continue;
            }
            for (const q of entry.questions) {
                const existing = await this.db
                    .select()
                    .from(performance_review_questions_schema_1.performanceReviewQuestions)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.question, q.question), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.competencyId, competency.id), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isGlobal, true)));
                if (existing.length === 0) {
                    await this.db.insert(performance_review_questions_schema_1.performanceReviewQuestions).values({
                        question: q.question,
                        type: q.type,
                        competencyId: competency.id,
                        isMandatory: q.isMandatory ?? false,
                        allowNotes: q.allowNotes ?? false,
                        isActive: true,
                        isGlobal: true,
                        companyId: null,
                        createdAt: new Date(),
                    });
                }
            }
        }
        this.logger.info({}, 'prq:seedGlobals:done');
        return { message: 'Global questions seeded.' };
    }
    async getAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'prq:getAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(performance_review_questions_schema_1.performanceReviewQuestions)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isGlobal, true)));
            this.logger.debug({ companyId, count: rows.length }, 'prq:getAll:db:done');
            return rows;
        });
    }
    async getById(id, companyId) {
        const key = this.oneKey(companyId, id);
        this.logger.debug({ id, companyId, key }, 'prq:getById:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [question] = await this.db
                .select()
                .from(performance_review_questions_schema_1.performanceReviewQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isGlobal, true))));
            if (!question) {
                this.logger.warn({ id, companyId }, 'prq:getById:not-found');
                throw new common_1.NotFoundException('Question not found');
            }
            this.logger.debug({ id }, 'prq:getById:db:done');
            return question;
        });
    }
};
exports.PerformanceReviewQuestionService = PerformanceReviewQuestionService;
exports.PerformanceReviewQuestionService = PerformanceReviewQuestionService = PerformanceReviewQuestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], PerformanceReviewQuestionService);
//# sourceMappingURL=questions.service.js.map