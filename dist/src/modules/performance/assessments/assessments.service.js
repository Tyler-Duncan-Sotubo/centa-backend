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
var AssessmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_assessments_schema_1 = require("./schema/performance-assessments.schema");
const schema_1 = require("../../../drizzle/schema");
const performance_assessment_comments_schema_1 = require("./schema/performance-assessment-comments.schema");
const date_fns_1 = require("date-fns");
const performance_assessment_responses_schema_1 = require("./schema/performance-assessment-responses.schema");
const performance_feedback_schema_1 = require("../feedback/schema/performance-feedback.schema");
const clock_in_out_service_1 = require("../../time/clock-in-out/clock-in-out.service");
const audit_service_1 = require("../../audit/audit.service");
const performance_feedback_responses_schema_1 = require("../feedback/schema/performance-feedback-responses.schema");
const performance_assessment_conclusions_schema_1 = require("./schema/performance-assessment-conclusions.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let AssessmentsService = AssessmentsService_1 = class AssessmentsService {
    constructor(db, clockInOutService, auditService, logger, cache) {
        this.db = db;
        this.clockInOutService = clockInOutService;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(AssessmentsService_1.name);
    }
    oneKey(assessmentId) {
        return `pa:assessment:${assessmentId}:detail`;
    }
    dashboardKey(companyId, filters) {
        const f = JSON.stringify(filters ?? {});
        return `pa:${companyId}:dashboard:${f}`;
    }
    userListKey(userId) {
        return `pa:user:${userId}:list`;
    }
    teamKey(managerId, cycleId) {
        return `pa:team:${managerId}:cycle:${cycleId}`;
    }
    reviewSummaryKey(revieweeId, cycleId) {
        return `pa:summary:${revieweeId}:${cycleId}`;
    }
    attendanceKey(userId, companyId, start, end) {
        return `pa:att:${userId}:${companyId}:${start}:${end}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.assessmentId)
            jobs.push(this.cache.del(this.oneKey(opts.assessmentId)));
        if (opts.reviewerId)
            jobs.push(this.cache.del(this.userListKey(opts.reviewerId)));
        if (opts.revieweeId)
            jobs.push(this.cache.del(this.userListKey(opts.revieweeId)));
        if (opts.managerId && opts.cycleId)
            jobs.push(this.cache.del(this.teamKey(opts.managerId, opts.cycleId)));
        if (opts.revieweeId && opts.cycleId)
            jobs.push(this.cache.del(this.reviewSummaryKey(opts.revieweeId, opts.cycleId)));
        if (opts.attendance) {
            const { userId, companyId, start, end } = opts.attendance;
            jobs.push(this.cache.del(this.attendanceKey(userId, companyId, start, end)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:assessments');
    }
    async createAssessment(dto, user) {
        this.logger.info({ userId: user.id, companyId: user.companyId, dto }, 'assessment:create:start');
        let reviewerId = user.id;
        let revieweeId = dto.revieweeId;
        if (dto.type === 'self') {
            if (user.role === 'super_admin' || user.role === 'admin') {
                if (!dto.revieweeId) {
                    this.logger.warn({ userId: user.id }, 'assessment:create:self:admin-missing-reviewee');
                    throw new common_1.BadRequestException('revieweeId must be provided for self reviews by admins.');
                }
            }
            else {
                const employee = await this.db.query.employees.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.employees.userId, user.id),
                });
                if (!employee) {
                    this.logger.warn({ userId: user.id }, 'assessment:create:self:no-employee');
                    throw new common_1.BadRequestException('No employee record found for current user.');
                }
                revieweeId = employee.id;
            }
            reviewerId = user.id;
        }
        const [assessment] = await this.db
            .insert(performance_assessments_schema_1.performanceAssessments)
            .values({
            companyId: user.companyId,
            cycleId: dto.cycleId,
            templateId: dto.templateId,
            reviewerId,
            revieweeId,
            type: dto.type,
            status: 'not_started',
            createdAt: new Date(),
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'assessment',
            entityId: assessment.id,
            userId: user.id,
            details: 'Assessment created',
            changes: {
                assessmentId: assessment.id,
                revieweeId: assessment.revieweeId,
                reviewerId: assessment.reviewerId,
                cycleId: assessment.cycleId,
            },
        });
        await this.burst({
            reviewerId,
            revieweeId,
            cycleId: dto.cycleId,
        });
        this.logger.info({ id: assessment.id }, 'assessment:create:done');
        return assessment;
    }
    async startAssessment(assessmentId, userId) {
        this.logger.info({ assessmentId, userId }, 'assessment:start:start');
        const assessment = await this.getAssessmentById(assessmentId);
        if (assessment.reviewerId !== userId) {
            this.logger.warn({ assessmentId, userId }, 'assessment:start:forbidden');
            throw new common_1.ForbiddenException('Not authorized to start this assessment');
        }
        if (assessment.status !== 'not_started') {
            this.logger.warn({ assessmentId, status: assessment.status }, 'assessment:start:invalid-state');
            throw new common_1.BadRequestException('Assessment is already in progress or submitted');
        }
        await this.auditService.logAction({
            action: 'start',
            entity: 'assessment',
            entityId: assessment.id,
            userId,
            details: 'Assessment started',
            changes: {
                assessmentId: assessment.id,
                revieweeId: assessment.revieweeId,
                reviewerId: assessment.reviewerId,
                cycleId: assessment.cycleId,
            },
        });
        await this.db
            .update(performance_assessments_schema_1.performanceAssessments)
            .set({ status: 'in_progress' })
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .execute();
        await this.burst({ assessmentId, reviewerId: userId });
        this.logger.info({ assessmentId }, 'assessment:start:done');
    }
    async saveSectionComments(assessmentId, userId, dto) {
        this.logger.info({ assessmentId, userId }, 'assessment:saveSectionComments:start');
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .execute();
        if (!assessment) {
            this.logger.warn({ assessmentId }, 'assessment:saveSectionComments:not-found');
            throw new common_1.NotFoundException('Assessment not found');
        }
        if (assessment.reviewerId !== userId) {
            this.logger.warn({ assessmentId, userId }, 'assessment:saveSectionComments:forbidden');
            throw new common_1.ForbiddenException('Not authorized to edit this assessment');
        }
        if (assessment.status === 'submitted') {
            this.logger.warn({ assessmentId }, 'assessment:saveSectionComments:already-submitted');
            throw new common_1.BadRequestException('Assessment is already finalized');
        }
        const sections = [
            { key: 'goalsComment', section: 'goals' },
            { key: 'attendanceComment', section: 'attendance' },
            { key: 'feedbackComment', section: 'feedback' },
            { key: 'questionnaireComment', section: 'questionnaire' },
        ];
        const now = new Date();
        for (const { key, section } of sections) {
            const comment = dto[key];
            if (comment && comment.trim() !== '') {
                await this.db
                    .delete(performance_assessment_comments_schema_1.assessmentSectionComments)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessment_comments_schema_1.assessmentSectionComments.assessmentId, assessmentId), (0, drizzle_orm_1.eq)(performance_assessment_comments_schema_1.assessmentSectionComments.section, section)))
                    .execute();
                await this.db
                    .insert(performance_assessment_comments_schema_1.assessmentSectionComments)
                    .values({
                    assessmentId,
                    section,
                    comment,
                    createdAt: now,
                })
                    .execute();
            }
        }
        await this.auditService.logAction({
            action: 'save_section_comments',
            entity: 'assessment',
            entityId: assessment.id,
            userId,
            details: 'Section comments saved',
            changes: {
                assessmentId: assessment.id,
                revieweeId: assessment.revieweeId,
                reviewerId: assessment.reviewerId,
                cycleId: assessment.cycleId,
                comments: sections.reduce((acc, { key, section }) => {
                    acc[section] = dto[key] || '';
                    return acc;
                }, {}),
            },
        });
        await this.burst({ assessmentId });
        this.logger.info({ assessmentId }, 'assessment:saveSectionComments:done');
        return { success: true };
    }
    async getAssessmentsForDashboard(companyId, filters) {
        const key = this.dashboardKey(companyId, filters);
        this.logger.debug({ key, companyId, filters }, 'dashboard:get:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const whereClauses = [(0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.companyId, companyId)];
            if (filters?.status && filters.status !== 'all') {
                whereClauses.push((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.status, filters.status));
            }
            if (filters?.type && filters.type !== 'all') {
                whereClauses.push((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.type, filters.type));
            }
            if (filters?.cycleId && filters.cycleId !== 'all') {
                whereClauses.push((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, filters.cycleId));
            }
            if (filters?.reviewerId && filters.reviewerId !== 'all') {
                whereClauses.push((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.reviewerId, filters.reviewerId));
            }
            if (filters?.departmentId && filters.departmentId !== 'all') {
                whereClauses.push((0, drizzle_orm_1.eq)(schema_1.departments.id, filters.departmentId));
            }
            const assessments = await this.db
                .select({
                id: performance_assessments_schema_1.performanceAssessments.id,
                type: performance_assessments_schema_1.performanceAssessments.type,
                status: performance_assessments_schema_1.performanceAssessments.status,
                createdAt: performance_assessments_schema_1.performanceAssessments.createdAt,
                submittedAt: performance_assessments_schema_1.performanceAssessments.submittedAt,
                cycleId: performance_assessments_schema_1.performanceAssessments.cycleId,
                dueDate: schema_1.performanceCycles.endDate,
                templateId: performance_assessments_schema_1.performanceAssessments.templateId,
                revieweeId: performance_assessments_schema_1.performanceAssessments.revieweeId,
                revieweeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                departmentId: schema_1.employees.departmentId,
                departmentName: schema_1.departments.name,
                jobRoleName: schema_1.jobRoles.title,
                score: performance_assessment_conclusions_schema_1.assessmentConclusions.finalScore,
                reviewerId: performance_assessments_schema_1.performanceAssessments.reviewerId,
                reviewerName: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(performance_assessments_schema_1.performanceAssessments)
                .leftJoin(schema_1.performanceCycles, (0, drizzle_orm_1.eq)(schema_1.performanceCycles.id, performance_assessments_schema_1.performanceAssessments.cycleId))
                .leftJoin(performance_assessment_conclusions_schema_1.assessmentConclusions, (0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, performance_assessments_schema_1.performanceAssessments.id))
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_assessments_schema_1.performanceAssessments.revieweeId))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_assessments_schema_1.performanceAssessments.reviewerId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
                .where((0, drizzle_orm_1.and)(...whereClauses))
                .execute();
            let filtered = assessments;
            if (filters?.search?.trim()) {
                const keyword = filters.search.toLowerCase();
                filtered = assessments.filter((a) => a.revieweeName?.toLowerCase().includes(keyword));
            }
            const out = filtered.map((a) => ({
                id: a.id,
                type: a.type,
                status: a.status,
                reviewer: a.reviewerName,
                employee: a.revieweeName,
                departmentName: a.departmentName,
                jobRoleName: a.jobRoleName,
                createdAt: a.createdAt,
                submittedAt: a.submittedAt,
                progress: this.calculateProgress(a.status ?? ''),
                dueDate: a.dueDate,
                score: a.score ?? null,
            }));
            this.logger.debug({ companyId, count: out.length }, 'dashboard:get:db:done');
            return out;
        });
    }
    async getAssessmentById(assessmentId) {
        const key = this.oneKey(assessmentId);
        this.logger.debug({ key, assessmentId }, 'assessment:get:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [assessment] = await this.db
                .select({
                id: performance_assessments_schema_1.performanceAssessments.id,
                type: performance_assessments_schema_1.performanceAssessments.type,
                status: performance_assessments_schema_1.performanceAssessments.status,
                createdAt: performance_assessments_schema_1.performanceAssessments.createdAt,
                submittedAt: performance_assessments_schema_1.performanceAssessments.submittedAt,
                cycleId: performance_assessments_schema_1.performanceAssessments.cycleId,
                dueDate: schema_1.performanceCycles.endDate,
                templateId: performance_assessments_schema_1.performanceAssessments.templateId,
                companyId: performance_assessments_schema_1.performanceAssessments.companyId,
                revieweeId: performance_assessments_schema_1.performanceAssessments.revieweeId,
                revieweeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                departmentName: schema_1.departments.name,
                reviewerId: performance_assessments_schema_1.performanceAssessments.reviewerId,
                reviewerName: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(performance_assessments_schema_1.performanceAssessments)
                .leftJoin(schema_1.performanceCycles, (0, drizzle_orm_1.eq)(schema_1.performanceCycles.id, performance_assessments_schema_1.performanceAssessments.cycleId))
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_assessments_schema_1.performanceAssessments.revieweeId))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_assessments_schema_1.performanceAssessments.reviewerId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
                .execute();
            if (!assessment) {
                this.logger.warn({ assessmentId }, 'assessment:get:not-found');
                throw new common_1.NotFoundException('Assessment not found');
            }
            const [template] = await this.db
                .select()
                .from(schema_1.performanceReviewTemplates)
                .where((0, drizzle_orm_1.eq)(schema_1.performanceReviewTemplates.id, assessment.templateId))
                .execute();
            const [cycle] = await this.db
                .select()
                .from(schema_1.performanceCycles)
                .where((0, drizzle_orm_1.eq)(schema_1.performanceCycles.id, assessment.cycleId))
                .execute();
            if (!template || !cycle) {
                this.logger.warn({ assessmentId }, 'assessment:get:template-or-cycle:not-found');
                throw new common_1.NotFoundException('Template or cycle not found');
            }
            const result = { ...assessment, templateName: template.name };
            const sectionComments = await this.db
                .select({
                section: performance_assessment_comments_schema_1.assessmentSectionComments.section,
                comment: performance_assessment_comments_schema_1.assessmentSectionComments.comment,
            })
                .from(performance_assessment_comments_schema_1.assessmentSectionComments)
                .where((0, drizzle_orm_1.eq)(performance_assessment_comments_schema_1.assessmentSectionComments.assessmentId, assessment.id))
                .execute();
            result.sectionComments = sectionComments;
            if (template.includeQuestionnaire) {
                const questions = await this.db
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
                    .leftJoin(performance_assessment_responses_schema_1.assessmentResponses, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.assessmentId, assessment.id), (0, drizzle_orm_1.eq)(performance_assessment_responses_schema_1.assessmentResponses.questionId, schema_1.performanceReviewQuestions.id)))
                    .leftJoin(schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(schema_1.performanceCompetencies.id, schema_1.performanceReviewQuestions.competencyId))
                    .where((0, drizzle_orm_1.eq)(schema_1.performanceTemplateQuestions.templateId, template.id))
                    .orderBy(schema_1.performanceTemplateQuestions.order)
                    .execute();
                const groupedQuestions = questions.reduce((acc, q) => {
                    const key = q.competency || 'Uncategorized';
                    if (!acc[key])
                        acc[key] = [];
                    acc[key].push(q);
                    return acc;
                }, {});
                result.questions = groupedQuestions;
            }
            if (template.includeGoals) {
                const goals = await this.db
                    .select({
                    id: schema_1.performanceGoals.id,
                    title: schema_1.performanceGoals.title,
                    dueDate: schema_1.performanceGoals.dueDate,
                    weight: schema_1.performanceGoals.weight,
                    status: schema_1.performanceGoals.status,
                    employee: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                    employeeId: schema_1.employees.id,
                    departmentName: schema_1.departments.name,
                    departmentId: schema_1.departments.id,
                })
                    .from(schema_1.performanceGoals)
                    .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.performanceGoals.employeeId))
                    .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceGoals.employeeId, assessment.revieweeId)))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceGoals.assignedAt))
                    .execute();
                const latestProgress = await this.db
                    .select({
                    goalId: schema_1.performanceGoalUpdates.goalId,
                    progress: schema_1.performanceGoalUpdates.progress,
                })
                    .from(schema_1.performanceGoalUpdates)
                    .where((0, drizzle_orm_1.inArray)(schema_1.performanceGoalUpdates.goalId, goals.map((g) => g.id)))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceGoalUpdates.createdAt))
                    .execute();
                const progressMap = new Map();
                for (const update of latestProgress) {
                    if (!progressMap.has(update.goalId)) {
                        progressMap.set(update.goalId, update.progress);
                    }
                }
                result.goals = goals.map((g) => ({
                    ...g,
                    progress: progressMap.get(g.id) ?? 0,
                }));
            }
            if (template.includeFeedback) {
                const feedbacks = await this.db
                    .select({
                    id: performance_feedback_schema_1.performanceFeedback.id,
                    type: performance_feedback_schema_1.performanceFeedback.type,
                    createdAt: performance_feedback_schema_1.performanceFeedback.createdAt,
                    isAnonymous: performance_feedback_schema_1.performanceFeedback.isAnonymous,
                    isArchived: performance_feedback_schema_1.performanceFeedback.isArchived,
                    employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                    senderFirstName: schema_1.users.firstName,
                    senderLastName: schema_1.users.lastName,
                    departmentName: schema_1.departments.name,
                    departmentId: schema_1.departments.id,
                })
                    .from(performance_feedback_schema_1.performanceFeedback)
                    .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, assessment.revieweeId))
                    .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_feedback_schema_1.performanceFeedback.recipientId))
                    .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                    .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_feedback_schema_1.performanceFeedback.senderId))
                    .execute();
                const feedbackIds = feedbacks.map((f) => f.id);
                const responses = await this.getResponsesForFeedback(feedbackIds);
                result.feedback = feedbacks.map((f) => ({
                    id: f.id,
                    type: f.type,
                    createdAt: f.createdAt,
                    employeeName: f.employeeName,
                    senderName: f.isAnonymous
                        ? 'Anonymous'
                        : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
                    questionsCount: responses.filter((r) => r.feedbackId === f.id).length,
                    departmentName: f.departmentName,
                    departmentId: f.departmentId,
                }));
            }
            if (template.includeAttendance) {
                const att = await this.getAttendanceSummaryForCycle(assessment.revieweeId, assessment.companyId, {
                    startDate: cycle.startDate,
                    endDate: cycle.endDate,
                });
                result.attendance = att;
            }
            this.logger.debug({ assessmentId }, 'assessment:get:db:done');
            return result;
        });
    }
    async getAssessmentsForUser(userId) {
        const key = this.userListKey(userId);
        this.logger.debug({ key, userId }, 'assessment:user:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(performance_assessments_schema_1.performanceAssessments)
                .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.revieweeId, userId))
                .execute();
            this.logger.debug({ userId, count: rows.length }, 'assessment:user:list:db:done');
            return rows;
        });
    }
    async getTeamAssessments(managerId, cycleId) {
        const key = this.teamKey(managerId, cycleId);
        this.logger.debug({ key, managerId, cycleId }, 'assessment:team:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const team = await this.db
                .select({ id: schema_1.users.id })
                .from(schema_1.users)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
                .where((0, drizzle_orm_1.eq)(schema_1.employees.managerId, managerId))
                .execute();
            const teamIds = team.map((u) => u.id);
            const rows = await this.db
                .select()
                .from(performance_assessments_schema_1.performanceAssessments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, cycleId), (0, drizzle_orm_1.inArray)(performance_assessments_schema_1.performanceAssessments.revieweeId, teamIds), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.type, 'manager')))
                .execute();
            this.logger.debug({ managerId, count: rows.length }, 'assessment:team:list:db:done');
            return rows;
        });
    }
    async getReviewSummary(revieweeId, cycleId) {
        const key = this.reviewSummaryKey(revieweeId, cycleId);
        this.logger.debug({ key, revieweeId, cycleId }, 'assessment:summary:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const reviews = await this.db
                .select()
                .from(performance_assessments_schema_1.performanceAssessments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, cycleId), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.revieweeId, revieweeId)))
                .execute();
            this.logger.debug({ revieweeId, count: reviews.length }, 'assessment:summary:db:done');
            return reviews;
        });
    }
    async getAttendanceSummaryForCycle(userId, companyId, cycle) {
        const key = this.attendanceKey(userId, companyId, cycle.startDate, cycle.endDate);
        this.logger.debug({ key, userId, companyId }, 'assessment:att:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const months = (0, date_fns_1.eachMonthOfInterval)({
                start: cycle.startDate,
                end: cycle.endDate,
            }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM'));
            const attendancePromises = months.map((month) => this.clockInOutService.getEmployeeAttendanceByMonth(userId, companyId, month));
            const monthlyResults = await Promise.all(attendancePromises);
            this.logger.debug({ userId, months: months.length }, 'assessment:att:db:done');
            const summary = { totalDays: 0, present: 0, absent: 0, late: 0 };
            for (const { summaryList } of monthlyResults) {
                for (const record of summaryList) {
                    summary.totalDays++;
                    if (record.status === 'present')
                        summary.present++;
                    if (record.status === 'absent')
                        summary.absent++;
                    if (record.status === 'late')
                        summary.late++;
                }
            }
            return summary;
        });
    }
    calculateProgress(status) {
        switch (status) {
            case 'not_started':
                return 0;
            case 'in_progress':
                return 50;
            case 'submitted':
                return 100;
            default:
                return 0;
        }
    }
    async getResponsesForFeedback(feedbackIds) {
        this.logger.debug({ count: feedbackIds.length }, 'assessment:feedback-responses:get:start');
        const rows = await this.db
            .select({
            feedbackId: performance_feedback_responses_schema_1.feedbackResponses.feedbackId,
            questionId: performance_feedback_responses_schema_1.feedbackResponses.question,
        })
            .from(performance_feedback_responses_schema_1.feedbackResponses)
            .where((0, drizzle_orm_1.inArray)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, feedbackIds))
            .execute();
        this.logger.debug({ count: rows.length }, 'assessment:feedback-responses:get:done');
        return rows;
    }
};
exports.AssessmentsService = AssessmentsService;
exports.AssessmentsService = AssessmentsService = AssessmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, clock_in_out_service_1.ClockInOutService,
        audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], AssessmentsService);
//# sourceMappingURL=assessments.service.js.map