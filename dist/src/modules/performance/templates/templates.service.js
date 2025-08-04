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
exports.PerformanceTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../schema");
let PerformanceTemplatesService = class PerformanceTemplatesService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
        this.lookupQuestionIds = async (db, questions, companyId) => {
            const rows = await db.query.performanceReviewQuestions.findMany({
                where: (q, { and, eq, isNull }) => and(companyId ? eq(q.companyId, companyId) : isNull(q.companyId), eq(q.isGlobal, true)),
            });
            const matchedIds = [];
            for (const text of questions) {
                const match = rows.find((q) => q.question === text);
                if (match)
                    matchedIds.push(match.id);
                else
                    console.warn(`⚠️ Question not found: ${text}`);
            }
            return matchedIds;
        };
    }
    async create(user, dto) {
        const { companyId, id: userId } = user;
        const [template] = await this.db
            .insert(schema_1.performanceReviewTemplates)
            .values({
            companyId,
            name: dto.name,
            description: dto.description,
            isDefault: dto.isDefault ?? false,
            includeGoals: dto.includeGoals ?? false,
            includeAttendance: dto.includeAttendance ?? false,
            includeFeedback: dto.includeFeedback ?? false,
            includeQuestionnaire: dto.includeQuestionnaire ?? false,
            requireSignature: dto.requireSignature ?? false,
            restrictVisibility: dto.restrictVisibility ?? false,
            createdAt: new Date(),
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'performance_review_template',
            entityId: template.id,
            userId,
            details: `Created performance review template: ${template.name}`,
            changes: {
                name: template.name,
                description: template.description,
                isDefault: template.isDefault,
                includeGoals: template.includeGoals,
                includeAttendance: template.includeAttendance,
                includeFeedback: template.includeFeedback,
                includeQuestionnaire: template.includeQuestionnaire,
                requireSignature: template.requireSignature,
                restrictVisibility: template.restrictVisibility,
            },
        });
        return template;
    }
    findAll(companyId) {
        return this.db
            .select()
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId));
    }
    async findOne(id, companyId) {
        const template = await this.db.query.performanceReviewTemplates.findFirst({
            where: (tpl, { eq }) => eq(tpl.id, id),
        });
        if (!template)
            throw new common_1.NotFoundException('Template not found');
        const questions = await this.db
            .select({
            id: schema_1.performanceReviewQuestions.id,
            question: schema_1.performanceReviewQuestions.question,
            type: schema_1.performanceReviewQuestions.type,
            isMandatory: schema_1.performanceTemplateQuestions.isMandatory,
            order: schema_1.performanceTemplateQuestions.order,
            competencyId: schema_1.performanceReviewQuestions.competencyId,
            competencyName: schema_1.performanceCompetencies.name,
        })
            .from(schema_1.performanceTemplateQuestions)
            .innerJoin(schema_1.performanceReviewQuestions, (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, schema_1.performanceReviewQuestions.id))
            .innerJoin(schema_1.performanceReviewTemplates, (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, schema_1.performanceReviewTemplates.id))
            .leftJoin(schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(schema_1.performanceReviewQuestions.competencyId, schema_1.performanceCompetencies.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, id), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId)))
            .orderBy(schema_1.performanceTemplateQuestions.order);
        return { ...template, questions };
    }
    async getById(id, companyId) {
        const [template] = await this.db
            .select()
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId)));
        if (!template)
            throw new common_1.NotFoundException('Template not found');
        return template;
    }
    async update(id, updateTemplateDto, user) {
        await this.getById(id, user.companyId);
        const [updated] = await this.db
            .update(schema_1.performanceReviewTemplates)
            .set({ ...updateTemplateDto })
            .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_review_template',
            entityId: id,
            userId: user.id,
            details: `Updated performance review template: ${updated.name}`,
            changes: {
                name: updated.name,
                description: updated.description,
                isDefault: updated.isDefault,
                includeGoals: updated.includeGoals,
                includeAttendance: updated.includeAttendance,
                includeFeedback: updated.includeFeedback,
                includeQuestionnaire: updated.includeQuestionnaire,
                requireSignature: updated.requireSignature,
                restrictVisibility: updated.restrictVisibility,
            },
        });
        return updated;
    }
    async remove(id, user) {
        const template = await this.getById(id, user.companyId);
        await this.db
            .delete(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_review_template',
            entityId: id,
            userId: user.id,
            details: `Deleted performance review template: ${template.name}`,
        });
    }
    async assignQuestions(templateId, questionIds, user) {
        await this.db
            .delete(schema_1.performanceTemplateQuestions)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId));
        const payload = questionIds.map((qid, index) => ({
            templateId,
            questionId: qid,
            order: index,
            isMandatory: true,
        }));
        await this.db.insert(schema_1.performanceTemplateQuestions).values(payload);
        await this.auditService.logAction({
            action: 'assign_questions',
            entity: 'performance_review_template',
            entityId: templateId,
            userId: user.id,
            details: `Assigned ${payload.length} questions to template ${templateId}`,
        });
        return { success: true, count: payload.length };
    }
    async removeQuestion(templateId, questionId, user) {
        await this.db
            .delete(schema_1.performanceTemplateQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId), (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, questionId)));
        await this.auditService.logAction({
            action: 'remove_question',
            entity: 'performance_review_template',
            entityId: templateId,
            userId: user.id,
            details: `Removed question ${questionId} from template ${templateId}`,
        });
        return { success: true };
    }
    async seedDefaultTemplate(companyId) {
        const [template] = await this.db
            .insert(schema_1.performanceReviewTemplates)
            .values({
            companyId,
            name: 'Default Performance Review',
            description: 'A general-purpose review template suitable for most roles.',
            isDefault: true,
            includeGoals: false,
            includeAttendance: true,
            includeFeedback: false,
            includeQuestionnaire: true,
            requireSignature: true,
            restrictVisibility: false,
            createdAt: new Date(),
        })
            .returning();
        if (!template)
            return;
        const questionTexts = [
            'How clearly does the employee communicate in verbal interactions?',
            'Does the employee communicate effectively in writing?',
            'How well does the employee support team members?',
            'Can the employee identify the root cause of issues?',
            'Describe how the employee approaches problem solving.',
            'Does the employee demonstrate strong knowledge of their job?',
            'Is the employee up to date with industry best practices?',
            'Rate the employee’s efficiency in completing tasks.',
        ];
        const questionIds = await this.lookupQuestionIds(this.db, questionTexts);
        const payload = questionIds.map((qid, i) => ({
            templateId: template.id,
            questionId: qid,
            order: i,
            isMandatory: true,
        }));
        await this.db.insert(schema_1.performanceTemplateQuestions).values(payload);
    }
};
exports.PerformanceTemplatesService = PerformanceTemplatesService;
exports.PerformanceTemplatesService = PerformanceTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PerformanceTemplatesService);
//# sourceMappingURL=templates.service.js.map