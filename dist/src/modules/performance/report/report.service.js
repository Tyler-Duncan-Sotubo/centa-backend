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
var ReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const performance_appraisals_schema_1 = require("../appraisals/schema/performance-appraisals.schema");
const performance_appraisal_cycle_schema_1 = require("../appraisals/schema/performance-appraisal-cycle.schema");
const performance_feedback_schema_1 = require("../feedback/schema/performance-feedback.schema");
const performance_feedback_responses_schema_1 = require("../feedback/schema/performance-feedback-responses.schema");
const performance_assessments_schema_1 = require("../assessments/schema/performance-assessments.schema");
const performance_assessment_conclusions_schema_1 = require("../assessments/schema/performance-assessment-conclusions.schema");
const performance_appraisals_entries_schema_1 = require("../appraisals/schema/performance-appraisals-entries.schema");
const performance_feedback_questions_schema_1 = require("../feedback/schema/performance-feedback-questions.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let ReportService = ReportService_1 = class ReportService {
    constructor(db, logger, cache) {
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(ReportService_1.name);
    }
    kReportFilters(companyId) {
        return `rpt:${companyId}:filters`;
    }
    kAppraisal(companyId, f) {
        return `rpt:${companyId}:appraisal:${this.ser(f)}`;
    }
    kGoals(companyId, f) {
        return `rpt:${companyId}:goals:${this.ser(f)}`;
    }
    kFeedback(companyId, f) {
        return `rpt:${companyId}:feedback:${this.ser(f)}`;
    }
    kAssessments(companyId, f) {
        return `rpt:${companyId}:assess:${this.ser(f)}`;
    }
    kTop(companyId, f) {
        return `rpt:${companyId}:top:${this.ser(f)}`;
    }
    kHeatmap(companyId, cycleId) {
        return `rpt:${companyId}:heatmap:${cycleId ?? 'active'}`;
    }
    kParticipation(companyId, cycleId) {
        return `rpt:${companyId}:participation:${cycleId ?? 'active'}`;
    }
    kOverview(companyId) {
        return `rpt:${companyId}:overview`;
    }
    ser(obj) {
        if (!obj)
            return 'none';
        const entries = Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : 1));
        return entries.map(([k, v]) => `${k}:${String(v)}`).join('|');
    }
    async reportFilters(companyId) {
        const key = this.kReportFilters(companyId);
        this.logger.debug({ companyId, key }, 'report:filters:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const cycles = await this.db
                .select({ id: schema_1.performanceCycles.id, name: schema_1.performanceCycles.name })
                .from(schema_1.performanceCycles)
                .where((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
                .execute();
            const appraisalCycles = await this.db
                .select({
                id: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id,
                name: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
            })
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
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
            this.logger.debug({
                companyId,
                cycles: cycles.length,
                appraisalCycles: appraisalCycles.length,
                employees: employeesList.length,
                departments: departmentsList.length,
            }, 'report:filters:db:done');
            return { cycles, employeesList, departmentsList, appraisalCycles };
        });
    }
    async getAppraisalReport(user, filters) {
        const key = this.kAppraisal(user.companyId, filters);
        this.logger.debug({ key, filters }, 'report:appraisal:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const { cycleId, employeeId, departmentId, minimumScore } = filters || {};
            let targetCycleId = cycleId;
            if (!targetCycleId) {
                const [activeCycle] = await this.db
                    .select({
                    id: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id,
                    name: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
                    startDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate,
                    endDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.endDate,
                    status: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status,
                })
                    .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status, 'active')))
                    .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                    .limit(1)
                    .execute();
                if (!activeCycle)
                    return [];
                targetCycleId = activeCycle.id;
            }
            const report = await this.db
                .select({
                cycleId: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id,
                cycleName: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
                appraisalId: performance_appraisals_schema_1.appraisals.id,
                employeeId: schema_1.employees.id,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                jobRoleName: schema_1.jobRoles.title,
                departmentName: schema_1.departments.name,
                appraisalNote: performance_appraisals_schema_1.appraisals.finalNote,
                appraisalScore: performance_appraisals_schema_1.appraisals.finalScore,
                promotionRecommendation: performance_appraisals_schema_1.appraisals.promotionRecommendation,
                submittedAt: performance_appraisals_schema_1.appraisals.createdAt,
            })
                .from(performance_appraisals_schema_1.appraisals)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_appraisals_schema_1.appraisals.employeeId))
                .innerJoin(performance_appraisal_cycle_schema_1.performanceAppraisalCycles, (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, performance_appraisals_schema_1.appraisals.cycleId))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, user.companyId), targetCycleId ? (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, targetCycleId) : undefined, employeeId ? (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, employeeId) : undefined, departmentId ? (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, departmentId) : undefined, minimumScore !== undefined
                ? (0, drizzle_orm_1.gte)(performance_appraisals_schema_1.appraisals.finalScore, minimumScore)
                : undefined))
                .execute();
            this.logger.debug({ count: report.length }, 'report:appraisal:db:done');
            return report;
        });
    }
    async getGoalReport(user, filters) {
        const key = this.kGoals(user.companyId, filters);
        this.logger.debug({ key, filters }, 'report:goal:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
            const report = await this.db
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
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceGoals.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceGoals.cycleId, targetCycleId), (0, drizzle_orm_1.eq)(schema_1.performanceGoals.isArchived, false), employeeId
                ? (0, drizzle_orm_1.eq)(schema_1.performanceGoals.employeeId, employeeId)
                : undefined, departmentId ? (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, departmentId) : undefined, status ? (0, drizzle_orm_1.eq)(schema_1.performanceGoals.status, status) : undefined, minimumWeight !== undefined
                ? (0, drizzle_orm_1.gte)(schema_1.performanceGoals.weight, minimumWeight)
                : undefined))
                .execute();
            this.logger.debug({ count: report.length }, 'report:goal:db:done');
            return report;
        });
    }
    async getFeedbackReport(user, filters) {
        const key = this.kFeedback(user.companyId, filters);
        this.logger.debug({ key, filters }, 'report:feedback:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
            const grouped = {};
            for (const r of responses) {
                if (!grouped[r.feedbackId])
                    grouped[r.feedbackId] = [];
                grouped[r.feedbackId].push({
                    questionText: r.questionText,
                    answer: r.answer,
                    order: r.order ?? 0,
                });
            }
            const report = feedbackEntries.map((entry) => ({
                ...entry,
                senderName: entry.isAnonymous ? undefined : entry.senderName,
                responses: grouped[entry.feedbackId] || [],
            }));
            this.logger.debug({ count: report.length }, 'report:feedback:db:done');
            return report;
        });
    }
    async getAssessmentReportSummary(user, filters) {
        const key = this.kAssessments(user.companyId, filters);
        this.logger.debug({ key, filters }, 'report:assess:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
            const result = await this.db
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
            this.logger.debug({ count: result.length }, 'report:assess:db:done');
            return result;
        });
    }
    async getTopEmployees(user, filter) {
        const key = this.kTop(user.companyId, filter);
        this.logger.debug({ key, filter }, 'report:top:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const { cycleType = 'appraisal', departmentId, jobRoleId } = filter;
            const isAppraisal = cycleType === 'appraisal';
            const [latestCycle] = await this.db
                .select()
                .from(isAppraisal ? performance_appraisal_cycle_schema_1.performanceAppraisalCycles : schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(isAppraisal
                ? performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId
                : schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(isAppraisal
                ? performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status
                : schema_1.performanceCycles.status, 'active')))
                .orderBy((0, drizzle_orm_1.desc)(isAppraisal
                ? performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate
                : schema_1.performanceCycles.startDate))
                .limit(1)
                .execute();
            if (!latestCycle)
                return [];
            if (isAppraisal) {
                const where = [
                    (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, latestCycle.id),
                    (0, drizzle_orm_1.isNotNull)(performance_appraisals_schema_1.appraisals.finalScore),
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
                    finalScore: performance_appraisals_schema_1.appraisals.finalScore,
                    promotionRecommendation: performance_appraisals_schema_1.appraisals.promotionRecommendation,
                })
                    .from(performance_appraisals_schema_1.appraisals)
                    .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, schema_1.employees.id))
                    .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
                    .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                    .where((0, drizzle_orm_1.and)(...where))
                    .orderBy((0, drizzle_orm_1.desc)(performance_appraisals_schema_1.appraisals.finalScore))
                    .limit(10)
                    .execute();
                this.logger.debug({ count: rows.length }, 'report:top:appraisal:db:done');
                return rows;
            }
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
            this.logger.debug({ count: rows.length }, 'report:top:review:db:done');
            return rows;
        });
    }
    async getCompetencyHeatmap(user, filters) {
        const key = this.kHeatmap(user.companyId, filters?.cycleId);
        this.logger.debug({ key, filters }, 'report:heatmap:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            let targetCycleId = filters?.cycleId;
            if (!targetCycleId) {
                const [activeCycle] = await this.db
                    .select({
                    id: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id,
                    name: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
                    startDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate,
                    endDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.endDate,
                    status: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status,
                })
                    .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status, 'active')))
                    .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                    .limit(1)
                    .execute();
                if (!activeCycle)
                    return [];
                targetCycleId = activeCycle.id;
            }
            const result = await this.db
                .select({
                competencyName: schema_1.performanceCompetencies.name,
                levelName: schema_1.competencyLevels.name,
                count: (0, drizzle_orm_1.sql) `count(*)`.as('count'),
            })
                .from(performance_appraisals_entries_schema_1.appraisalEntries)
                .innerJoin(performance_appraisals_schema_1.appraisals, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, performance_appraisals_entries_schema_1.appraisalEntries.appraisalId))
                .innerJoin(schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(schema_1.performanceCompetencies.id, performance_appraisals_entries_schema_1.appraisalEntries.competencyId))
                .leftJoin(schema_1.competencyLevels, (0, drizzle_orm_1.eq)(schema_1.competencyLevels.id, performance_appraisals_entries_schema_1.appraisalEntries.employeeLevelId))
                .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, targetCycleId))
                .groupBy(schema_1.performanceCompetencies.name, schema_1.competencyLevels.name)
                .orderBy(schema_1.performanceCompetencies.name, schema_1.competencyLevels.name)
                .execute();
            const heatmap = {};
            for (const row of result) {
                if (!heatmap[row.competencyName])
                    heatmap[row.competencyName] = {};
                heatmap[row.competencyName][row.levelName ?? 'Unrated'] = row.count;
            }
            this.logger.debug({ groups: Object.keys(heatmap).length }, 'report:heatmap:db:done');
            return heatmap;
        });
    }
    async getParticipationReport(user, filters) {
        const key = this.kParticipation(user.companyId, filters?.cycleId);
        this.logger.debug({ key, filters }, 'report:participation:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            let targetCycleId = filters?.cycleId;
            if (!targetCycleId) {
                const [activeCycle] = await this.db
                    .select({ id: schema_1.performanceCycles.id })
                    .from(schema_1.performanceCycles)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.performanceCycles.status, 'active')))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.performanceCycles.startDate))
                    .limit(1)
                    .execute();
                if (!activeCycle)
                    return [];
                targetCycleId = activeCycle.id;
            }
            const rows = await this.db
                .select({
                employeeId: schema_1.employees.id,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                submittedByEmployee: performance_appraisals_schema_1.appraisals.submittedByEmployee,
                submittedByManager: performance_appraisals_schema_1.appraisals.submittedByManager,
                finalized: performance_appraisals_schema_1.appraisals.finalized,
            })
                .from(performance_appraisals_schema_1.appraisals)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, targetCycleId)))
                .execute();
            const out = rows.map((r) => ({
                employeeId: r.employeeId,
                employeeName: r.employeeName,
                submittedByEmployee: r.submittedByEmployee,
                submittedByManager: r.submittedByManager,
                finalized: r.finalized,
                completed: Boolean(r.submittedByEmployee && r.submittedByManager),
            }));
            this.logger.debug({ count: out.length }, 'report:participation:db:done');
            return out;
        });
    }
    async getPerformanceOverview(user) {
        const key = this.kOverview(user.companyId);
        this.logger.debug({ key }, 'report:overview:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [appraisalCycle] = await this.db
                .select({
                id: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id,
                name: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
                startDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate,
                endDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.endDate,
                status: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status,
            })
                .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, user.companyId), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status, 'active')))
                .orderBy((0, drizzle_orm_1.desc)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate))
                .limit(1)
                .execute();
            const [performanceCycle] = await this.db
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
            if (!appraisalCycle && !performanceCycle)
                return [];
            const [appraisalsReport, goalsReport, peerFeedback, mgrFeedback, selfFeedback, participationRecords, heatmap,] = await Promise.all([
                this.getAppraisalReport(user),
                this.getGoalReport(user, {}),
                this.getFeedbackReport(user, { type: 'peer' }),
                this.getFeedbackReport(user, { type: 'manager' }),
                this.getFeedbackReport(user, { type: 'employee' }),
                this.getParticipationReport(user),
                this.getCompetencyHeatmap(user, { cycleId: '' }),
            ]);
            const [topAppraisal] = await this.getTopEmployees(user, {
                cycleType: 'appraisal',
            });
            const [topReview] = await this.getTopEmployees(user, {
                cycleType: 'performance',
            });
            let topEmployee = null;
            if (topAppraisal && topReview) {
                topEmployee =
                    (topAppraisal.finalScore ?? 0) >= (topReview.finalScore ?? 0)
                        ? { ...topAppraisal, source: 'appraisal' }
                        : { ...topReview, source: 'review' };
            }
            else {
                topEmployee = topAppraisal
                    ? { ...topAppraisal, source: 'appraisal' }
                    : topReview
                        ? { ...topReview, source: 'review' }
                        : null;
            }
            const totalAppraisals = appraisalsReport.length;
            const completedAppraisals = appraisalsReport.filter((a) => a.appraisalScore != null).length;
            const completionRate = totalAppraisals
                ? completedAppraisals / totalAppraisals
                : 0;
            const onTimeCount = appraisalCycle
                ? appraisalsReport.filter((a) => a.submittedAt &&
                    new Date(a.submittedAt) <= new Date(appraisalCycle.endDate)).length
                : 0;
            const overdueCount = completedAppraisals - onTimeCount;
            const avgTimeToCompleteDays = completedAppraisals && appraisalCycle
                ? appraisalsReport
                    .filter((a) => a.submittedAt)
                    .reduce((sum, a) => {
                    if (!a.submittedAt)
                        return sum;
                    const days = (new Date(a.submittedAt).getTime() -
                        new Date(appraisalCycle.startDate).getTime()) /
                        (1000 * 60 * 60 * 24);
                    return sum + days;
                }, 0) / completedAppraisals
                : 0;
            const scores = appraisalsReport
                .map((a) => a.appraisalScore ?? 0)
                .filter((s) => s != null);
            const avgScore = scores.length
                ? scores.reduce((sum, v) => sum + v, 0) / scores.length
                : 0;
            const buckets = { '0-50': 0, '51-70': 0, '71-85': 0, '86-100': 0 };
            scores.forEach((s) => {
                if (s <= 50)
                    buckets['0-50']++;
                else if (s <= 70)
                    buckets['51-70']++;
                else if (s <= 85)
                    buckets['71-85']++;
                else
                    buckets['86-100']++;
            });
            const recommendationCounts = appraisalsReport.reduce((acc, a) => {
                const r = a.promotionRecommendation || 'none';
                acc[r] = (acc[r] || 0) + 1;
                return acc;
            }, {});
            const totalGoals = goalsReport.length;
            const completedGoals = goalsReport.filter((g) => g.status === 'completed').length;
            const overdueGoals = goalsReport.filter((g) => new Date(g.dueDate) < new Date() && g.status !== 'completed').length;
            const peerCount = peerFeedback.length;
            const managerCount = mgrFeedback.length;
            const selfCount = selfFeedback.length;
            const uniqueEmployees = new Set([...peerFeedback, ...mgrFeedback, ...selfFeedback].map((f) => f.recipientId)).size;
            const totalFeedback = peerCount + managerCount + selfCount;
            const avgPerEmployee = uniqueEmployees
                ? totalFeedback / uniqueEmployees
                : 0;
            const anonymityRate = totalFeedback
                ? (peerFeedback.filter((f) => f.isAnonymous).length +
                    mgrFeedback.filter((f) => f.isAnonymous).length +
                    selfFeedback.filter((f) => f.isAnonymous).length) /
                    totalFeedback
                : 0;
            const totalParticipants = participationRecords.length;
            const completedParticipants = participationRecords.filter((p) => p.completed).length;
            const participationRate = totalParticipants
                ? completedParticipants / totalParticipants
                : 0;
            const overview = {
                appraisalCycle,
                cycleHealth: {
                    totalAppraisals,
                    completedAppraisals,
                    completionRate,
                    onTimeCount,
                    overdueCount,
                    avgTimeToCompleteDays,
                },
                appraisalOutcomes: {
                    avgScore,
                    scoreDistribution: buckets,
                    recommendationCounts,
                },
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
                competencyInsights: {
                    heatmap,
                },
                participation: {
                    total: totalParticipants,
                    completed: completedParticipants,
                    completionRate: participationRate,
                },
                topEmployees: [topEmployee],
            };
            this.logger.debug({
                totals: {
                    appraisals: totalAppraisals,
                    goals: totalGoals,
                    feedback: totalFeedback,
                    participants: totalParticipants,
                },
            }, 'report:overview:done');
            return overview;
        });
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = ReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], ReportService);
//# sourceMappingURL=report.service.js.map