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
exports.SelfAssessmentsService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../../common/cache/cache.service");
const schema_1 = require("../../../drizzle/schema");
const performance_assessments_schema_1 = require("./schema/performance-assessments.schema");
const performance_assessment_responses_schema_1 = require("./schema/performance-assessment-responses.schema");
const performance_assessment_self_summaries_schema_1 = require("./schema/performance-assessment-self-summaries.schema");
let SelfAssessmentsService = class SelfAssessmentsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async invalidate(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async getEmployeeOrThrow(user) {
        const [emp] = await this.db
            .select({
            id: schema_1.employees.id,
            companyId: schema_1.employees.companyId,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.userId, user.id), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId)))
            .limit(1);
        if (!emp)
            throw new common_1.BadRequestException('No employee record found for current user.');
        return emp;
    }
    async getCycleOrThrow(companyId, cycleId) {
        const [cycle] = await this.db
            .select({
            id: schema_1.performanceCycles.id,
            name: schema_1.performanceCycles.name,
            startDate: schema_1.performanceCycles.startDate,
            endDate: schema_1.performanceCycles.endDate,
            companyId: schema_1.performanceCycles.companyId,
        })
            .from(schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.id, cycleId), (0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, companyId)))
            .limit(1);
        if (!cycle)
            throw new common_1.NotFoundException('Cycle not found');
        return cycle;
    }
    async pickSelfTemplateOrThrow(companyId) {
        const [tpl] = await this.db
            .select({
            id: schema_1.performanceReviewTemplates.id,
            name: schema_1.performanceReviewTemplates.name,
            includeGoals: schema_1.performanceReviewTemplates.includeGoals,
            includeQuestionnaire: schema_1.performanceReviewTemplates
                .includeQuestionnaire,
        })
            .from(schema_1.performanceReviewTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.companyId, companyId))
            .limit(1);
        if (!tpl)
            throw new common_1.BadRequestException('No self template configured');
        return tpl;
    }
    async getOrCreateSelfAssessment(user, cycleId) {
        const emp = await this.getEmployeeOrThrow(user);
        await this.getCycleOrThrow(user.companyId, cycleId);
        const template = await this.pickSelfTemplateOrThrow(user.companyId);
        const [existing] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, cycleId), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.type, 'self'), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.reviewerId, user.id), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.revieweeId, emp.id)))
            .limit(1);
        if (existing)
            return { assessment: existing, template, emp };
        const [created] = await this.db
            .insert(performance_assessments_schema_1.performanceAssessments)
            .values({
            companyId: user.companyId,
            cycleId,
            templateId: template.id,
            reviewerId: user.id,
            revieweeId: emp.id,
            type: 'self',
            status: 'not_started',
            createdAt: new Date(),
        })
            .returning();
        await this.invalidate(user.companyId);
        return { assessment: created, template, emp };
    }
    async getSelfAssessmentPayload(user, cycleId) {
        const { assessment, template, emp } = await this.getOrCreateSelfAssessment(user, cycleId);
        const questions = template.includeQuestionnaire
            ? await this.getQuestionsWithResponses(assessment.id, template.id)
            : null;
        const goals = template.includeGoals
            ? await this.getGoalsForEmployeeCycle(emp.id, assessment.cycleId)
            : null;
        const [selfSummary] = await this.db
            .select({
            summary: performance_assessment_self_summaries_schema_1.assessmentSelfSummaries.summary,
            updatedAt: performance_assessment_self_summaries_schema_1.assessmentSelfSummaries.updatedAt,
        })
            .from(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries)
            .where((0, drizzle_orm_1.eq)(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries.assessmentId, assessment.id))
            .limit(1);
        return {
            assessment,
            employee: {
                id: emp.id,
                name: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
            },
            template: {
                id: template.id,
                name: template.name,
                includeGoals: !!template.includeGoals,
                includeQuestionnaire: !!template.includeQuestionnaire,
            },
            questions,
            goals,
            selfSummary: selfSummary ?? null,
        };
    }
    async upsertSelfSummary(user, assessmentId, summary) {
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!assessment)
            throw new common_1.NotFoundException('Assessment not found');
        if (assessment.companyId !== user.companyId)
            throw new common_1.ForbiddenException('Forbidden');
        if (assessment.type !== 'self')
            throw new common_1.BadRequestException('Not a self assessment');
        if (assessment.reviewerId !== user.id)
            throw new common_1.ForbiddenException('Not authorized');
        if (assessment.status === 'submitted')
            throw new common_1.BadRequestException('Submitted and locked');
        const now = new Date();
        const [existing] = await this.db
            .select({ id: performance_assessment_self_summaries_schema_1.assessmentSelfSummaries.id })
            .from(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries)
            .where((0, drizzle_orm_1.eq)(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries.assessmentId, assessmentId))
            .limit(1);
        if (!existing) {
            const [created] = await this.db
                .insert(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries)
                .values({
                assessmentId,
                summary: summary ?? '',
                createdAt: now,
                updatedAt: now,
                createdBy: user.id,
                updatedBy: user.id,
            })
                .returning();
            await this.invalidate(user.companyId);
            return created;
        }
        const [updated] = await this.db
            .update(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries)
            .set({
            summary: summary ?? '',
            updatedAt: now,
            updatedBy: user.id,
        })
            .where((0, drizzle_orm_1.eq)(performance_assessment_self_summaries_schema_1.assessmentSelfSummaries.assessmentId, assessmentId))
            .returning();
        await this.invalidate(user.companyId);
        return updated;
    }
    async startSelfAssessment(user, assessmentId) {
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!assessment)
            throw new common_1.NotFoundException('Assessment not found');
        if (assessment.companyId !== user.companyId)
            throw new common_1.ForbiddenException('Forbidden');
        if (assessment.type !== 'self')
            throw new common_1.BadRequestException('Not a self assessment');
        if (assessment.reviewerId !== user.id)
            throw new common_1.ForbiddenException('Not authorized');
        if (assessment.status !== 'not_started')
            throw new common_1.BadRequestException('Already started/submitted');
        await this.db
            .update(performance_assessments_schema_1.performanceAssessments)
            .set({ status: 'in_progress' })
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId));
        await this.invalidate(user.companyId);
        return { success: true };
    }
    async submitSelfAssessment(user, assessmentId) {
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!assessment)
            throw new common_1.NotFoundException('Assessment not found');
        if (assessment.companyId !== user.companyId)
            throw new common_1.ForbiddenException('Forbidden');
        if (assessment.type !== 'self')
            throw new common_1.BadRequestException('Not a self assessment');
        if (assessment.reviewerId !== user.id)
            throw new common_1.ForbiddenException('Not authorized');
        if (assessment.status === 'submitted')
            throw new common_1.BadRequestException('Already submitted');
        const [updated] = await this.db
            .update(performance_assessments_schema_1.performanceAssessments)
            .set({ status: 'submitted', submittedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .returning();
        await this.invalidate(user.companyId);
        return updated;
    }
    async getQuestionsWithResponses(assessmentId, templateId) {
        const rows = await this.db
            .select({
            questionId: schema_1.performanceReviewQuestions.id,
            question: schema_1.performanceReviewQuestions.question,
            type: schema_1.performanceReviewQuestions.type,
            isGlobal: schema_1.performanceReviewQuestions.isGlobal,
            response: performance_assessment_responses_schema_1.assessmentResponses.response,
            order: schema_1.performanceTemplateQuestions.order,
            isMandatory: schema_1.performanceTemplateQuestions.isMandatory,
            competency: schema_1.performanceCompetencies.name,
        })
            .from(schema_1.performanceTemplateQuestions)
            .innerJoin(schema_1.performanceReviewQuestions, (0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.questionId, schema_1.performanceReviewQuestions.id))
            .leftJoin(performance_assessment_responses_schema_1.assessmentResponses, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessmentId), (0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.questionId, schema_1.performanceReviewQuestions.id)))
            .leftJoin(schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(schema_1.performanceCompetencies.id, schema_1.performanceReviewQuestions.competencyId))
            .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, templateId))
            .orderBy(schema_1.performanceTemplateQuestions.order);
        return rows.reduce((acc, q) => {
            const key = q.competency || 'Uncategorized';
            if (!acc[key])
                acc[key] = [];
            acc[key].push(q);
            return acc;
        }, {});
    }
    async getGoalsForEmployeeCycle(employeeId, cycleId) {
        const goals = await this.db
            .select({
            id: schema_1.performanceGoals.id,
            title: schema_1.performanceGoals.title,
            dueDate: schema_1.performanceGoals.dueDate,
            weight: schema_1.performanceGoals.weight,
            status: schema_1.performanceGoals.status,
        })
            .from(schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceGoals.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.performanceGoals.cycleId, cycleId), (0, drizzle_orm_1.inArray)(schema_1.performanceGoals.status, ['active', 'completed'])))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceGoals.assignedAt));
        const latestProgress = await this.db
            .select({
            goalId: schema_1.performanceGoalUpdates.goalId,
            progress: schema_1.performanceGoalUpdates.progress,
        })
            .from(schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.inArray)(schema_1.performanceGoalUpdates.goalId, goals.map((g) => g.id)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceGoalUpdates.createdAt));
        const progressMap = new Map();
        for (const u of latestProgress)
            if (!progressMap.has(u.goalId))
                progressMap.set(u.goalId, u.progress);
        return goals.map((g) => ({ ...g, progress: progressMap.get(g.id) ?? 0 }));
    }
};
exports.SelfAssessmentsService = SelfAssessmentsService;
exports.SelfAssessmentsService = SelfAssessmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], SelfAssessmentsService);
//# sourceMappingURL=self-assessments.service.js.map