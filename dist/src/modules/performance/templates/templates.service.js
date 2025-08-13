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
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let PerformanceTemplatesService = class PerformanceTemplatesService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.ttlSeconds = 60 * 5;
        this.lookupQuestionIds = async (dbConn, questions, companyId) => {
            const rows = await dbConn.query.performanceReviewQuestions.findMany({
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
    ns() {
        return ['performance', 'templates'];
    }
    tags(companyId) {
        return [`company:${companyId}`, 'performance', 'performance:templates'];
    }
    async bump(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
        await this.cache.invalidateTags(this.tags(companyId));
    }
    async create(user, dto) {
        const { companyId, id: userId } = user;
        const [dup] = await this.db
            .select({ id: schema_1.performanceReviewTemplates.id })
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.name, dto.name)))
            .execute();
        if (dup)
            throw new common_1.BadRequestException('A template with this name already exists');
        const created = await this.db.transaction(async (trx) => {
            if (dto.isDefault) {
                await trx
                    .update(schema_1.performanceReviewTemplates)
                    .set({ isDefault: false })
                    .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId))
                    .execute();
            }
            const [template] = await trx
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
                .returning()
                .execute();
            return template;
        });
        await this.auditService.logAction({
            action: 'create',
            entity: 'performance_review_template',
            entityId: created.id,
            userId,
            details: `Created performance review template: ${created.name}`,
            changes: {
                name: created.name,
                description: created.description,
                isDefault: created.isDefault,
                includeGoals: created.includeGoals,
                includeAttendance: created.includeAttendance,
                includeFeedback: created.includeFeedback,
                includeQuestionnaire: created.includeQuestionnaire,
                requireSignature: created.requireSignature,
                restrictVisibility: created.restrictVisibility,
            },
        });
        await this.bump(companyId);
        return created;
    }
    findAll(companyId) {
        const key = [...this.ns(), 'all'];
        return this.cache.getOrSetVersioned(companyId, [...key], async () => this.db
            .select()
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.performanceReviewTemplates.name))
            .execute(), { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async findOne(id, companyId) {
        const key = [...this.ns(), 'one', id];
        const data = await this.cache.getOrSetVersioned(companyId, [...key], async () => {
            const [template] = await this.db
                .select()
                .from(schema_1.performanceReviewTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId)))
                .execute();
            if (!template)
                return null;
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
                .leftJoin(schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(schema_1.performanceReviewQuestions.competencyId, schema_1.performanceCompetencies.id))
                .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, id))
                .orderBy(schema_1.performanceTemplateQuestions.order)
                .execute();
            return { template, questions };
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
        if (!data)
            throw new common_1.NotFoundException('Template not found');
        return { ...data.template, questions: data.questions };
    }
    async getById(id, companyId) {
        const [template] = await this.db
            .select()
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId)))
            .execute();
        if (!template)
            throw new common_1.NotFoundException('Template not found');
        return template;
    }
    async update(id, updateTemplateDto, user) {
        const { companyId } = await this.getById(id, user.companyId);
        const updated = await this.db.transaction(async (trx) => {
            if (updateTemplateDto.isDefault === true) {
                await trx
                    .update(schema_1.performanceReviewTemplates)
                    .set({ isDefault: false })
                    .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId))
                    .execute();
            }
            const [row] = await trx
                .update(schema_1.performanceReviewTemplates)
                .set({ ...updateTemplateDto })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId)))
                .returning()
                .execute();
            return row;
        });
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
        await this.bump(companyId);
        return updated;
    }
    async remove(id, user) {
        const template = await this.getById(id, user.companyId);
        await this.db.transaction(async (trx) => {
            await trx
                .delete(schema_1.performanceTemplateQuestions)
                .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, id))
                .execute();
            await trx
                .delete(schema_1.performanceReviewTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, id), (0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, user.companyId)))
                .execute();
        });
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_review_template',
            entityId: id,
            userId: user.id,
            details: `Deleted performance review template: ${template.name}`,
        });
        await this.bump(user.companyId);
        return { success: true };
    }
    async assignQuestions(templateId, questionIds, user) {
        const template = await this.getById(templateId, user.companyId);
        const questions = await this.db
            .select({
            id: schema_1.performanceReviewQuestions.id,
            companyId: schema_1.performanceReviewQuestions.companyId,
            isGlobal: schema_1.performanceReviewQuestions.isGlobal,
        })
            .from(schema_1.performanceReviewQuestions)
            .where((0, drizzle_orm_1.inArray)(schema_1.performanceReviewQuestions.id, questionIds))
            .execute();
        const unknown = questionIds.filter((id) => !questions.find((q) => q.id === id));
        if (unknown.length)
            throw new common_1.BadRequestException(`Unknown question IDs: ${unknown.join(', ')}`);
        const invalid = questions.filter((q) => !(q.isGlobal || q.companyId === template.companyId));
        if (invalid.length)
            throw new common_1.BadRequestException('Some questions do not belong to this company');
        await this.db.transaction(async (trx) => {
            await trx
                .delete(schema_1.performanceTemplateQuestions)
                .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId))
                .execute();
            const payload = questionIds.map((qid, index) => ({
                templateId,
                questionId: qid,
                order: index,
                isMandatory: true,
            }));
            if (payload.length) {
                await trx
                    .insert(schema_1.performanceTemplateQuestions)
                    .values(payload)
                    .execute();
            }
        });
        await this.auditService.logAction({
            action: 'assign_questions',
            entity: 'performance_review_template',
            entityId: templateId,
            userId: user.id,
            details: `Assigned ${questionIds.length} questions to template ${templateId}`,
        });
        await this.bump(user.companyId);
        return { success: true, count: questionIds.length };
    }
    async removeQuestion(templateId, questionId, user) {
        await this.getById(templateId, user.companyId);
        await this.db
            .delete(schema_1.performanceTemplateQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId), (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, questionId)))
            .execute();
        const remaining = await this.db
            .select({
            id: schema_1.performanceTemplateQuestions.questionId,
            order: schema_1.performanceTemplateQuestions.order,
        })
            .from(schema_1.performanceTemplateQuestions)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId))
            .orderBy(schema_1.performanceTemplateQuestions.order)
            .execute();
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].order !== i) {
                await this.db
                    .update(schema_1.performanceTemplateQuestions)
                    .set({ order: i })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId), (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, remaining[i].id)))
                    .execute();
            }
        }
        await this.auditService.logAction({
            action: 'remove_question',
            entity: 'performance_review_template',
            entityId: templateId,
            userId: user.id,
            details: `Removed question ${questionId} from template ${templateId}`,
        });
        await this.bump(user.companyId);
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
            .returning()
            .execute();
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
        if (questionIds.length) {
            const payload = questionIds.map((qid, i) => ({
                templateId: template.id,
                questionId: qid,
                order: i,
                isMandatory: true,
            }));
            await this.db
                .insert(schema_1.performanceTemplateQuestions)
                .values(payload)
                .execute();
        }
        await this.bump(companyId);
    }
};
exports.PerformanceTemplatesService = PerformanceTemplatesService;
exports.PerformanceTemplatesService = PerformanceTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], PerformanceTemplatesService);
//# sourceMappingURL=templates.service.js.map