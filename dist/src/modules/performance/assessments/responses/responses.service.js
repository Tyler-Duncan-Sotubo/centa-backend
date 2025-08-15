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
exports.AssessmentResponsesService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_assessment_responses_schema_1 = require("../schema/performance-assessment-responses.schema");
const schema_1 = require("../../../../drizzle/schema");
const performance_assessments_schema_1 = require("../schema/performance-assessments.schema");
const audit_service_1 = require("../../../audit/audit.service");
const cache_service_1 = require("../../../../common/cache/cache.service");
let AssessmentResponsesService = class AssessmentResponsesService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(companyId) {
        return [`company:${companyId}:assessments`];
    }
    async invalidate(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async getResponsesForAssessment(assessmentId) {
        const [meta] = await this.db
            .select({
            templateId: performance_assessments_schema_1.performanceAssessments.templateId,
            companyId: performance_assessments_schema_1.performanceAssessments.companyId,
        })
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!meta)
            throw new common_1.NotFoundException('Assessment not found');
        return this.cache.getOrSetVersioned(meta.companyId, ['assessments', 'responses', assessmentId], async () => {
            const results = await this.db
                .select({
                questionId: schema_1.performanceReviewQuestions.id,
                question: schema_1.performanceReviewQuestions.question,
                type: schema_1.performanceReviewQuestions.type,
                order: schema_1.performanceTemplateQuestions.order,
                response: performance_assessment_responses_schema_1.assessmentResponses.response,
            })
                .from(schema_1.performanceTemplateQuestions)
                .innerJoin(schema_1.performanceReviewQuestions, (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, schema_1.performanceReviewQuestions.id))
                .leftJoin(performance_assessment_responses_schema_1.assessmentResponses, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId), (0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.questionId, schema_1.performanceReviewQuestions.id)))
                .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, meta.templateId))
                .orderBy(schema_1.performanceTemplateQuestions.order);
            return results;
        });
    }
    async saveResponse(assessmentId, dto, user) {
        const [meta] = await this.db
            .select({
            templateId: performance_assessments_schema_1.performanceAssessments.templateId,
            companyId: performance_assessments_schema_1.performanceAssessments.companyId,
        })
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!meta)
            throw new common_1.NotFoundException('Assessment not found');
        const [belongs] = await this.db
            .select({ questionId: schema_1.performanceTemplateQuestions.questionId })
            .from(schema_1.performanceTemplateQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, meta.templateId), (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, dto.questionId)))
            .limit(1);
        if (!belongs) {
            throw new common_1.BadRequestException('Question does not belong to assessment template');
        }
        await this.db
            .delete(performance_assessment_responses_schema_1.assessmentResponses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId), (0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.questionId, dto.questionId)));
        await this.db.insert(performance_assessment_responses_schema_1.assessmentResponses).values({
            assessmentId,
            questionId: dto.questionId,
            response: dto.response,
            createdAt: new Date(),
        });
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
        await this.invalidate(meta.companyId);
        return { success: true };
    }
    async bulkSaveResponses(assessmentId, dto, user) {
        const [meta] = await this.db
            .select({
            templateId: performance_assessments_schema_1.performanceAssessments.templateId,
            companyId: performance_assessments_schema_1.performanceAssessments.companyId,
        })
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!meta)
            throw new common_1.NotFoundException('Assessment not found');
        const ids = dto.responses.map((r) => r.questionId);
        if (ids.length === 0) {
            return { success: true, count: 0 };
        }
        const validQs = await this.db
            .select({ questionId: schema_1.performanceTemplateQuestions.questionId })
            .from(schema_1.performanceTemplateQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, meta.templateId), (0, drizzle_orm_1.inArray)(schema_1.performanceTemplateQuestions.questionId, ids)));
        const validSet = new Set(validQs.map((q) => q.questionId));
        const invalid = ids.filter((id) => !validSet.has(id));
        if (invalid.length) {
            throw new common_1.BadRequestException(`Some questions do not belong to the assessment template: ${invalid.join(', ')}`);
        }
        await this.db
            .delete(performance_assessment_responses_schema_1.assessmentResponses)
            .where((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId));
        const payload = dto.responses.map((r) => ({
            assessmentId,
            questionId: r.questionId,
            response: r.response,
            createdAt: new Date(),
        }));
        await this.db.insert(performance_assessment_responses_schema_1.assessmentResponses).values(payload);
        await this.auditService.logAction({
            action: 'bulk_save',
            entity: 'assessment_response',
            entityId: assessmentId,
            userId: user.id,
            details: 'Bulk responses saved',
            changes: {
                assessmentId,
                responses: payload,
            },
        });
        await this.invalidate(meta.companyId);
        return { success: true, count: payload.length };
    }
};
exports.AssessmentResponsesService = AssessmentResponsesService;
exports.AssessmentResponsesService = AssessmentResponsesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], AssessmentResponsesService);
//# sourceMappingURL=responses.service.js.map