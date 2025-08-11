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
var AssessmentResponsesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentResponsesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_assessment_responses_schema_1 = require("../schema/performance-assessment-responses.schema");
const schema_1 = require("../../../../drizzle/schema");
const performance_assessments_schema_1 = require("../schema/performance-assessments.schema");
const audit_service_1 = require("../../../audit/audit.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let AssessmentResponsesService = AssessmentResponsesService_1 = class AssessmentResponsesService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(AssessmentResponsesService_1.name);
    }
    listKey(assessmentId) {
        return `assessment:${assessmentId}:responses`;
    }
    async burst(assessmentId) {
        await this.cache.del(this.listKey(assessmentId));
        this.logger.debug({ assessmentId }, 'cache:burst:assessment-responses');
    }
    async getResponsesForAssessment(assessmentId) {
        const key = this.listKey(assessmentId);
        this.logger.debug({ key, assessmentId }, 'responses:get:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [assessment] = await this.db
                .select({ templateId: performance_assessments_schema_1.performanceAssessments.templateId })
                .from(performance_assessments_schema_1.performanceAssessments)
                .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
                .execute();
            if (!assessment) {
                this.logger.warn({ assessmentId }, 'responses:get:assessment:not-found');
                throw new common_1.NotFoundException('Assessment not found');
            }
            const results = await this.db
                .select({
                questionId: schema_1.performanceReviewQuestions.id,
                question: schema_1.performanceReviewQuestions.question,
                type: schema_1.performanceReviewQuestions.type,
                order: schema_1.performanceTemplateQuestions.order,
                response: performance_assessment_responses_schema_1.assessmentResponses.response,
            })
                .from(performance_assessment_responses_schema_1.assessmentResponses)
                .innerJoin(schema_1.performanceReviewQuestions, (0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.questionId, schema_1.performanceReviewQuestions.id))
                .innerJoin(schema_1.performanceTemplateQuestions, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, schema_1.performanceReviewQuestions.id), (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, assessment.templateId)))
                .where((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId))
                .orderBy(schema_1.performanceTemplateQuestions.order)
                .execute();
            this.logger.debug({ assessmentId, count: results.length }, 'responses:get:db:done');
            return results;
        });
    }
    async saveResponse(assessmentId, dto, user) {
        this.logger.info({ assessmentId, questionId: dto.questionId, userId: user.id }, 'responses:save:start');
        await this.db
            .delete(performance_assessment_responses_schema_1.assessmentResponses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId), (0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.questionId, dto.questionId)))
            .execute();
        await this.db
            .insert(performance_assessment_responses_schema_1.assessmentResponses)
            .values({
            assessmentId,
            questionId: dto.questionId,
            response: dto.response,
            createdAt: new Date(),
        })
            .execute();
        await this.auditService.logAction({
            action: 'save',
            entity: 'assessment_response',
            entityId: dto.questionId,
            userId: user.id,
            details: 'Response saved',
            changes: {
                assessmentId,
                questionId: dto.questionId,
                response: dto.response,
            },
        });
        await this.burst(assessmentId);
        this.logger.info({ assessmentId, questionId: dto.questionId }, 'responses:save:done');
        return { success: true };
    }
    async bulkSaveResponses(assessmentId, dto, user) {
        this.logger.info({ assessmentId, count: dto.responses?.length ?? 0, userId: user.id }, 'responses:bulkSave:start');
        await this.db.transaction(async (trx) => {
            await trx
                .delete(performance_assessment_responses_schema_1.assessmentResponses)
                .where((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId))
                .execute();
            const payload = dto.responses.map((r) => ({
                assessmentId,
                questionId: r.questionId,
                response: r.response,
                createdAt: new Date(),
            }));
            if (payload.length) {
                await trx.insert(performance_assessment_responses_schema_1.assessmentResponses).values(payload).execute();
            }
        });
        await this.auditService.logAction({
            action: 'bulk_save',
            entity: 'assessment_response',
            entityId: assessmentId,
            userId: user.id,
            details: 'Bulk responses saved',
            changes: {
                assessmentId,
                responses: dto.responses,
            },
        });
        await this.burst(assessmentId);
        this.logger.info({ assessmentId }, 'responses:bulkSave:done');
        return { success: true, count: dto.responses.length };
    }
};
exports.AssessmentResponsesService = AssessmentResponsesService;
exports.AssessmentResponsesService = AssessmentResponsesService = AssessmentResponsesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], AssessmentResponsesService);
//# sourceMappingURL=responses.service.js.map