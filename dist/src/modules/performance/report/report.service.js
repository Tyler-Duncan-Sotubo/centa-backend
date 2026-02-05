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
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const performance_feedback_schema_1 = require("../feedback/schema/performance-feedback.schema");
const performance_feedback_responses_schema_1 = require("../feedback/schema/performance-feedback-responses.schema");
const performance_feedback_questions_schema_1 = require("../feedback/schema/performance-feedback-questions.schema");
const performance_assessments_schema_1 = require("../assessments/schema/performance-assessments.schema");
const performance_assessment_conclusions_schema_1 = require("../assessments/schema/performance-assessment-conclusions.schema");
let ReportService = class ReportService {
    constructor(db) {
        this.db = db;
    }
    async reportFilters(companyId) {
        const cycles = await this.db
            .select({ id: schema_1.performanceCycles.id, name: schema_1.performanceCycles.name })
            .from(schema_1.performanceCycles)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
            .execute();
        const employeesList = await this.db
            .select({
            id: schema_1.employees.id,
            name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId))
            .execute();
        const departmentsList = await this.db
            .select({ id: schema_1.departments.id, name: schema_1.departments.name })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
            .orderBy(schema_1.departments.name)
            .execute();
        return { cycles, employeesList, departmentsList };
    }
    async getGoalReport(user, filters) {
        const { cycleId, employeeId, departmentId, status, minimumWeight } = filters || {};
        let targetCycleId = cycleId;
        if (!targetCycleId) {
            const [activeCycle] = await this.db
                .select({
                id: schema_1.performanceCycles.id,
                name: schema_1.performanceCycles.name,
                startDate: schema_1.performanceCycles.startDate,
                endDate: schema_1.performanceCycles.endDate,
            })
                .from(schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceCycles.status, 'active')))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            if (!activeCycle)
                return [];
            targetCycleId = activeCycle.id;
        }
        return this.db
            .select({
            goalId: schema_1.performanceGoals.id,
            employeeId: schema_1.employees.id,
            employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            jobRoleName: schema_1.jobRoles.title,
            departmentName: schema_1.departments.name,
            title: schema_1.performanceGoals.title,
            description: schema_1.performanceGoals.description,
            type: schema_1.performanceGoals.type,
            status: schema_1.performanceGoals.status,
            weight: schema_1.performanceGoals.weight,
            startDate: schema_1.performanceGoals.startDate,
            dueDate: schema_1.performanceGoals.dueDate,
        })
            .from(schema_1.performanceGoals)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.performanceGoals.employeeId, schema_1.employees.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceGoals.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceGoals.cycleId, targetCycleId), (0, drizzle_orm_1.eq)(schema_1.performanceGoals.isArchived, false), employeeId ? (0, drizzle_orm_1.eq)(schema_1.performanceGoals.employeeId, employeeId) : undefined, departmentId ? (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, departmentId) : undefined, status ? (0, drizzle_orm_1.eq)(schema_1.performanceGoals.status, status) : undefined, minimumWeight !== undefined
            ? (0, drizzle_orm_1.gte)(schema_1.performanceGoals.weight, minimumWeight)
            : undefined))
            .execute();
    }
    async getFeedbackReport(user, filters) {
        const { type, employeeId } = filters;
        const feedbackEntries = await this.db
            .select({
            feedbackId: performance_feedback_schema_1.performanceFeedback.id,
            recipientId: performance_feedback_schema_1.performanceFeedback.recipientId,
            isAnonymous: performance_feedback_schema_1.performanceFeedback.isAnonymous,
            submittedAt: performance_feedback_schema_1.performanceFeedback.submittedAt,
            senderId: performance_feedback_schema_1.performanceFeedback.senderId,
            employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            senderName: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
        })
            .from(performance_feedback_schema_1.performanceFeedback)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, schema_1.employees.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.senderId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.type, type), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, false), employeeId
            ? (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, employeeId)
            : (0, drizzle_orm_1.isNotNull)(performance_feedback_schema_1.performanceFeedback.recipientId)))
            .execute();
        if (!feedbackEntries.length)
            return [];
        const feedbackIds = feedbackEntries.map((f) => f.feedbackId);
        const responses = await this.db
            .select({
            feedbackId: performance_feedback_responses_schema_1.feedbackResponses.feedbackId,
            questionText: performance_feedback_questions_schema_1.feedbackQuestions.question,
            answer: performance_feedback_responses_schema_1.feedbackResponses.answer,
            order: performance_feedback_responses_schema_1.feedbackResponses.order,
        })
            .from(performance_feedback_responses_schema_1.feedbackResponses)
            .innerJoin(performance_feedback_questions_schema_1.feedbackQuestions, (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, performance_feedback_responses_schema_1.feedbackResponses.question))
            .where((0, drizzle_orm_1.inArray)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, feedbackIds))
            .orderBy(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, performance_feedback_responses_schema_1.feedbackResponses.order)
            .execute();
        const groupedResponses = {};
        for (const r of responses) {
            if (!groupedResponses[r.feedbackId])
                groupedResponses[r.feedbackId] = [];
            groupedResponses[r.feedbackId].push({
                questionText: r.questionText,
                answer: r.answer,
                order: r.order ?? 0,
            });
        }
        return feedbackEntries.map((entry) => ({
            ...entry,
            senderName: entry.isAnonymous ? undefined : entry.senderName,
            responses: groupedResponses[entry.feedbackId] || [],
        }));
    }
    async getAssessmentReportSummary(user, filters) {
        const { cycleId, employeeId, reviewerId, departmentId, status } = filters || {};
        let targetCycleId = cycleId;
        if (!targetCycleId) {
            const [activeCycle] = await this.db
                .select({
                id: schema_1.performanceCycles.id,
                name: schema_1.performanceCycles.name,
                startDate: schema_1.performanceCycles.startDate,
                endDate: schema_1.performanceCycles.endDate,
            })
                .from(schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceCycles.status, 'active')))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            if (!activeCycle)
                return [];
            targetCycleId = activeCycle.id;
        }
        return this.db
            .select({
            id: performance_assessments_schema_1.performanceAssessments.id,
            employeeId: performance_assessments_schema_1.performanceAssessments.revieweeId,
            type: performance_assessments_schema_1.performanceAssessments.type,
            status: performance_assessments_schema_1.performanceAssessments.status,
            submittedAt: performance_assessments_schema_1.performanceAssessments.submittedAt,
            createdAt: performance_assessments_schema_1.performanceAssessments.createdAt,
            reviewerId: performance_assessments_schema_1.performanceAssessments.reviewerId,
            revieweeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            reviewerName: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            departmentName: schema_1.departments.name,
            finalScore: performance_assessment_conclusions_schema_1.assessmentConclusions.finalScore,
            promotionRecommendation: performance_assessment_conclusions_schema_1.assessmentConclusions.promotionRecommendation,
            potentialFlag: performance_assessment_conclusions_schema_1.assessmentConclusions.potentialFlag,
        })
            .from(performance_assessments_schema_1.performanceAssessments)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_assessments_schema_1.performanceAssessments.revieweeId))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_assessments_schema_1.performanceAssessments.reviewerId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
            .leftJoin(performance_assessment_conclusions_schema_1.assessmentConclusions, (0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, performance_assessments_schema_1.performanceAssessments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, targetCycleId), employeeId
            ? (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.revieweeId, employeeId)
            : undefined, reviewerId
            ? (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.reviewerId, reviewerId)
            : undefined, departmentId ? (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, departmentId) : undefined, status
            ? (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.status, status)
            : undefined))
            .orderBy((0, drizzle_orm_1.desc)(performance_assessments_schema_1.performanceAssessments.submittedAt))
            .execute();
    }
    async getTopEmployees(user, filter) {
        const { departmentId, jobRoleId } = filter;
        const [latestCycle] = await this.db
            .select({
            id: schema_1.performanceCycles.id,
            name: schema_1.performanceCycles.name,
            startDate: schema_1.performanceCycles.startDate,
        })
            .from(schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceCycles.status, 'active')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
            .limit(1)
            .execute();
        if (!latestCycle)
            return [];
        const where = [
            (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, latestCycle.id),
            (0, drizzle_orm_1.isNotNull)(performance_assessment_conclusions_schema_1.assessmentConclusions.finalScore),
        ];
        if (departmentId)
            where.push((0, drizzle_orm_1.eq)(schema_1.employees.departmentId, departmentId));
        if (jobRoleId)
            where.push((0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, jobRoleId));
        const rows = await this.db
            .select({
            employeeId: schema_1.employees.id,
            employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            departmentName: schema_1.departments.name,
            jobRoleName: schema_1.jobRoles.title,
            finalScore: performance_assessment_conclusions_schema_1.assessmentConclusions.finalScore,
            promotionRecommendation: performance_assessment_conclusions_schema_1.assessmentConclusions.promotionRecommendation,
            potentialFlag: performance_assessment_conclusions_schema_1.assessmentConclusions.potentialFlag,
        })
            .from(performance_assessments_schema_1.performanceAssessments)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.revieweeId, schema_1.employees.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
            .leftJoin(performance_assessment_conclusions_schema_1.assessmentConclusions, (0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, performance_assessments_schema_1.performanceAssessments.id))
            .where((0, drizzle_orm_1.and)(...where))
            .orderBy((0, drizzle_orm_1.desc)(performance_assessment_conclusions_schema_1.assessmentConclusions.finalScore))
            .limit(10)
            .execute();
        return rows.map((r) => ({ ...r, source: 'performance' }));
    }
    async getPerformanceOverview(user) {
        const [performanceCycle] = await this.db
            .select({
            id: schema_1.performanceCycles.id,
            name: schema_1.performanceCycles.name,
            startDate: schema_1.performanceCycles.startDate,
            endDate: schema_1.performanceCycles.endDate,
            status: schema_1.performanceCycles.status,
        })
            .from(schema_1.performanceCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceCycles.status, 'active')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
            .limit(1)
            .execute();
        if (!performanceCycle) {
            return {
                performanceCycle: null,
                goalPerformance: { totalGoals: 0, completedGoals: 0, overdueGoals: 0 },
                feedbackActivity: {
                    peerCount: 0,
                    managerCount: 0,
                    selfCount: 0,
                    avgPerEmployee: 0,
                    anonymityRate: 0,
                },
                assessmentActivity: {
                    total: 0,
                    submitted: 0,
                    inProgress: 0,
                    notStarted: 0,
                    avgScore: 0,
                    recommendationCounts: {},
                },
                topEmployees: [],
            };
        }
        const [goals, peerFeedback, mgrFeedback, selfFeedback, topEmployees] = await Promise.all([
            this.getGoalReport(user, { cycleId: performanceCycle.id }),
            this.getFeedbackReport(user, { type: 'peer' }),
            this.getFeedbackReport(user, { type: 'manager' }),
            this.getFeedbackReport(user, { type: 'employee' }),
            this.getTopEmployees(user, {
                cycleType: 'performance',
            }),
        ]);
        const totalGoals = goals.length;
        const completedGoals = goals.filter((g) => g.status === 'completed').length;
        const overdueGoals = goals.filter((g) => new Date(g.dueDate) < new Date() && g.status !== 'completed').length;
        const peerCount = peerFeedback.length;
        const managerCount = mgrFeedback.length;
        const selfCount = selfFeedback.length;
        const combinedFeedback = [...peerFeedback, ...mgrFeedback, ...selfFeedback];
        const uniqueEmployees = new Set(combinedFeedback.map((f) => f.recipientId).filter(Boolean)).size;
        const totalFeedback = peerCount + managerCount + selfCount;
        const avgPerEmployee = uniqueEmployees
            ? totalFeedback / uniqueEmployees
            : 0;
        const anonymityCount = peerFeedback.filter((f) => f.isAnonymous).length +
            mgrFeedback.filter((f) => f.isAnonymous).length +
            selfFeedback.filter((f) => f.isAnonymous).length;
        const anonymityRate = totalFeedback ? anonymityCount / totalFeedback : 0;
        const assessmentRows = await this.db
            .select({
            status: performance_assessments_schema_1.performanceAssessments.status,
            finalScore: performance_assessment_conclusions_schema_1.assessmentConclusions.finalScore,
            promotionRecommendation: performance_assessment_conclusions_schema_1.assessmentConclusions.promotionRecommendation,
        })
            .from(performance_assessments_schema_1.performanceAssessments)
            .leftJoin(performance_assessment_conclusions_schema_1.assessmentConclusions, (0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, performance_assessments_schema_1.performanceAssessments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.cycleId, performanceCycle.id)))
            .execute();
        const totalAssessments = assessmentRows.length;
        const submitted = assessmentRows.filter((a) => a.status === 'submitted').length;
        const inProgress = assessmentRows.filter((a) => a.status === 'in_progress').length;
        const notStarted = assessmentRows.filter((a) => a.status === 'not_started').length;
        const scored = assessmentRows
            .map((a) => a.finalScore)
            .filter((v) => v != null);
        const avgScore = scored.length
            ? scored.reduce((s, v) => s + v, 0) / scored.length
            : 0;
        const recommendationCounts = assessmentRows.reduce((acc, a) => {
            const r = (a.promotionRecommendation || 'none');
            acc[r] = (acc[r] || 0) + 1;
            return acc;
        }, {});
        const [topEmployee] = topEmployees;
        return {
            performanceCycle,
            goalPerformance: {
                totalGoals,
                completedGoals,
                overdueGoals,
            },
            feedbackActivity: {
                peerCount,
                managerCount,
                selfCount,
                avgPerEmployee,
                anonymityRate,
            },
            assessmentActivity: {
                total: totalAssessments,
                submitted,
                inProgress,
                notStarted,
                avgScore,
                recommendationCounts,
            },
            topEmployees: topEmployee ? [topEmployee] : [],
        };
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ReportService);
//# sourceMappingURL=report.service.js.map