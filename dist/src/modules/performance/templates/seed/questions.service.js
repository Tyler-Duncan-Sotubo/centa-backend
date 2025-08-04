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
exports.PerformanceReviewQuestionService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const performance_review_questions_schema_1 = require("../schema/performance-review-questions.schema");
const audit_service_1 = require("../../../audit/audit.service");
const performance_competencies_schema_1 = require("../schema/performance-competencies.schema");
const defaults_1 = require("./defaults");
let PerformanceReviewQuestionService = class PerformanceReviewQuestionService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(user, dto) {
        const { companyId, id: userId } = user;
        const [created] = await this.db
            .insert(performance_review_questions_schema_1.performanceReviewQuestions)
            .values({
            companyId,
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
            userId: userId,
            details: `Created question: ${created.question}`,
        });
        return created;
    }
    async getAll(companyId) {
        return this.db
            .select()
            .from(performance_review_questions_schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isGlobal, true)));
    }
    async getById(id, companyId) {
        const [question] = await this.db
            .select()
            .from(performance_review_questions_schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.isGlobal, true))));
        if (!question)
            throw new common_1.NotFoundException('Question not found');
        if (question.companyId !== companyId)
            throw new common_1.ForbiddenException('Cannot delete global or other company’s question');
        return question;
    }
    async update(id, user, dto) {
        const { companyId, id: userId } = user;
        await this.getById(id, companyId);
        await this.db
            .update(performance_review_questions_schema_1.performanceReviewQuestions)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id));
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_review_question',
            entityId: id,
            userId: userId,
            details: `Updated question: ${dto.question}`,
            changes: {
                question: dto.question,
                type: dto.type,
                competencyId: dto.competencyId,
                isMandatory: dto.isMandatory,
                allowNotes: dto.allowNotes,
            },
        });
        return { message: 'Updated successfully' };
    }
    async delete(id, user) {
        const { companyId, id: userId } = user;
        const question = await this.getById(id, companyId);
        await this.db
            .delete(performance_review_questions_schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.eq)(performance_review_questions_schema_1.performanceReviewQuestions.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_review_question',
            entityId: id,
            userId: userId,
            details: `Deleted question: ${question.question}`,
        });
        return { message: 'Deleted successfully' };
    }
    async seedGlobalReviewQuestions() {
        for (const entry of defaults_1.questions) {
            const [competency] = await this.db
                .select()
                .from(performance_competencies_schema_1.performanceCompetencies)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.name, entry.competency), (0, drizzle_orm_1.eq)(performance_competencies_schema_1.performanceCompetencies.isGlobal, true)));
            if (!competency) {
                console.warn(`Competency not found: ${entry.competency}`);
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
        return { message: 'Global questions seeded.' };
    }
};
exports.PerformanceReviewQuestionService = PerformanceReviewQuestionService;
exports.PerformanceReviewQuestionService = PerformanceReviewQuestionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PerformanceReviewQuestionService);
//# sourceMappingURL=questions.service.js.map