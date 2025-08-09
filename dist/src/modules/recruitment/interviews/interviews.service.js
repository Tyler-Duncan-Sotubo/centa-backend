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
var InterviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema");
const audit_service_1 = require("../../audit/audit.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let InterviewsService = InterviewsService_1 = class InterviewsService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(InterviewsService_1.name);
    }
    allKey(companyId) {
        return `iv:${companyId}:list`;
    }
    detailKey(interviewId) {
        return `iv:${interviewId}:detail`;
    }
    appListKey(applicationId) {
        return `iv:app:${applicationId}:list`;
    }
    feedbackKey(interviewId) {
        return `iv:${interviewId}:feedback`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.allKey(opts.companyId)));
        if (opts.interviewId) {
            jobs.push(this.cache.del(this.detailKey(opts.interviewId)));
            jobs.push(this.cache.del(this.feedbackKey(opts.interviewId)));
        }
        if (opts.applicationId)
            jobs.push(this.cache.del(this.appListKey(opts.applicationId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:interviews');
    }
    async scheduleInterview(dto, user) {
        this.logger.info({
            applicationId: dto.applicationId,
            stage: dto.stage,
            interviewerCount: dto.interviewerIds?.length ?? 0,
        }, 'iv:schedule:start');
        const [interview] = await this.db
            .insert(schema_1.interviews)
            .values({
            applicationId: dto.applicationId,
            scheduledFor: new Date(dto.scheduledFor),
            durationMins: dto.durationMins,
            stage: dto.stage,
            meetingLink: dto.meetingLink,
            eventId: dto.eventId,
            mode: dto.mode,
            emailTemplateId: dto.emailTemplateId,
        })
            .returning()
            .execute();
        const assignments = (dto.interviewerIds ?? []).map((id) => ({
            interviewId: interview.id,
            interviewerId: id,
            scorecardTemplateId: dto.scorecardTemplateId,
        }));
        if (assignments.length)
            await this.db.insert(schema_1.interviewInterviewers).values(assignments).execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'interview',
            entityId: interview.id,
            userId: user.id,
            details: 'Interview scheduled',
            changes: { ...dto, interviewId: interview.id },
        });
        try {
            const [appRow] = await this.db
                .select({ companyId: schema_1.job_postings.companyId })
                .from(schema_1.applications)
                .innerJoin(schema_1.job_postings, (0, drizzle_orm_1.eq)(schema_1.applications.jobId, schema_1.job_postings.id))
                .where((0, drizzle_orm_1.eq)(schema_1.applications.id, dto.applicationId))
                .execute();
            await this.burst({
                companyId: appRow?.companyId,
                applicationId: dto.applicationId,
            });
        }
        catch (e) {
            this.logger.warn({ applicationId: dto.applicationId, error: e.message }, 'iv:schedule:burst:skip');
        }
        this.logger.info({ id: interview.id }, 'iv:schedule:done');
        return interview;
    }
    async rescheduleInterview(interviewId, dto, user) {
        this.logger.info({ interviewId }, 'iv:reschedule:start');
        const [interview] = await this.db
            .update(schema_1.interviews)
            .set({
            scheduledFor: new Date(dto.scheduledFor),
            durationMins: dto.durationMins,
            stage: dto.stage,
            meetingLink: dto.meetingLink,
            mode: dto.mode,
            eventId: dto.eventId,
            emailTemplateId: dto.emailTemplateId ?? undefined,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.interviews.id, interviewId))
            .returning()
            .execute();
        await this.db
            .delete(schema_1.interviewInterviewers)
            .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interviewId))
            .execute();
        const assignments = (dto.interviewerIds ?? []).map((id) => ({
            interviewId: interview.id,
            interviewerId: id,
            scorecardTemplateId: dto.scorecardTemplateId,
        }));
        if (assignments.length)
            await this.db.insert(schema_1.interviewInterviewers).values(assignments).execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'interview',
            entityId: interviewId,
            userId: user.id,
            details: 'Interview rescheduled',
            changes: { ...dto },
        });
        try {
            const [appRow] = await this.db
                .select({
                applicationId: schema_1.interviews.applicationId,
                companyId: schema_1.job_postings.companyId,
            })
                .from(schema_1.interviews)
                .innerJoin(schema_1.applications, (0, drizzle_orm_1.eq)(schema_1.interviews.applicationId, schema_1.applications.id))
                .innerJoin(schema_1.job_postings, (0, drizzle_orm_1.eq)(schema_1.applications.jobId, schema_1.job_postings.id))
                .where((0, drizzle_orm_1.eq)(schema_1.interviews.id, interviewId))
                .execute();
            await this.burst({
                companyId: appRow?.companyId,
                applicationId: appRow?.applicationId,
                interviewId,
            });
        }
        catch (e) {
            this.logger.warn({ interviewId, error: e.message }, 'iv:reschedule:burst:skip');
        }
        this.logger.info({ interviewId }, 'iv:reschedule:done');
        return interview;
    }
    async findAllInterviews(companyId) {
        const key = this.allKey(companyId);
        this.logger.debug({ key, companyId }, 'iv:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const allInterviews = await this.db
                .select({
                interview: schema_1.interviews,
                application: schema_1.applications,
                job: schema_1.job_postings,
                candidate: schema_1.candidates,
            })
                .from(schema_1.interviews)
                .innerJoin(schema_1.applications, (0, drizzle_orm_1.eq)(schema_1.interviews.applicationId, schema_1.applications.id))
                .innerJoin(schema_1.job_postings, (0, drizzle_orm_1.eq)(schema_1.applications.jobId, schema_1.job_postings.id))
                .innerJoin(schema_1.candidates, (0, drizzle_orm_1.eq)(schema_1.applications.candidateId, schema_1.candidates.id))
                .where((0, drizzle_orm_1.eq)(schema_1.job_postings.companyId, companyId))
                .execute();
            if (allInterviews.length === 0)
                return [];
            const results = await Promise.all(allInterviews.map(async ({ interview, candidate }) => {
                const interviewers = await this.db
                    .select({
                    interviewerId: schema_1.interviewInterviewers.interviewerId,
                    scorecardTemplateId: schema_1.interviewInterviewers.scorecardTemplateId,
                })
                    .from(schema_1.interviewInterviewers)
                    .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interview.id))
                    .execute();
                const templateIds = [
                    ...new Set(interviewers.map((i) => i.scorecardTemplateId).filter(Boolean)),
                ];
                const criteria = templateIds.length
                    ? await this.db
                        .select({
                        id: schema_1.scorecard_criteria.id,
                        label: schema_1.scorecard_criteria.label,
                        description: schema_1.scorecard_criteria.description,
                        maxScore: schema_1.scorecard_criteria.maxScore,
                        order: schema_1.scorecard_criteria.order,
                        templateId: schema_1.scorecard_criteria.templateId,
                    })
                        .from(schema_1.scorecard_criteria)
                        .where((0, drizzle_orm_1.inArray)(schema_1.scorecard_criteria.templateId, templateIds))
                        .orderBy((0, drizzle_orm_1.asc)(schema_1.scorecard_criteria.order))
                        .execute()
                    : [];
                return {
                    id: interview.id,
                    applicationId: interview.applicationId,
                    scheduledFor: interview.scheduledFor,
                    durationMins: interview.durationMins,
                    stage: interview.stage,
                    mode: interview.mode,
                    meetingLink: interview.meetingLink,
                    candidateName: candidate.fullName,
                    interviewers,
                    scorecardCriteria: criteria,
                };
            }));
            this.logger.debug({ companyId, count: results.length }, 'iv:list:db:done');
            return results;
        });
    }
    async getInterviewDetails(interviewId) {
        const key = this.detailKey(interviewId);
        this.logger.debug({ key, interviewId }, 'iv:detail:cache:get');
        const payload = await this.cache.getOrSetCache(key, async () => {
            const [interview] = await this.db
                .select()
                .from(schema_1.interviews)
                .where((0, drizzle_orm_1.eq)(schema_1.interviews.id, interviewId))
                .execute();
            if (!interview)
                return null;
            const interviewers = await this.db
                .select()
                .from(schema_1.interviewInterviewers)
                .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interviewId))
                .execute();
            const templateIds = [
                ...new Set(interviewers.map((i) => i.scorecardTemplateId).filter(Boolean)),
            ];
            const criteria = templateIds.length
                ? await this.db
                    .select()
                    .from(schema_1.scorecard_criteria)
                    .where((0, drizzle_orm_1.inArray)(schema_1.scorecard_criteria.templateId, templateIds))
                    .orderBy((0, drizzle_orm_1.asc)(schema_1.scorecard_criteria.order))
                    .execute()
                : [];
            const criteriaByTemplate = {};
            for (const c of criteria) {
                if (!criteriaByTemplate[c.templateId])
                    criteriaByTemplate[c.templateId] = [];
                criteriaByTemplate[c.templateId].push(c);
            }
            return {
                ...interview,
                interviewers,
                scorecardCriteria: criteriaByTemplate,
            };
        });
        if (!payload) {
            this.logger.warn({ interviewId }, 'iv:detail:not-found');
            throw new common_1.NotFoundException('Interview not found');
        }
        return payload;
    }
    async listInterviewsForApplication(applicationId) {
        const key = this.appListKey(applicationId);
        this.logger.debug({ key, applicationId }, 'iv:appList:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(schema_1.interviews)
                .where((0, drizzle_orm_1.eq)(schema_1.interviews.applicationId, applicationId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.interviews.scheduledFor))
                .execute();
            this.logger.debug({ applicationId, count: rows.length }, 'iv:appList:db:done');
            return rows;
        });
    }
    async listInterviewerFeedback(interviewId) {
        const key = this.feedbackKey(interviewId);
        this.logger.debug({ key, interviewId }, 'iv:feedback:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const scores = await this.db
                .select({
                id: schema_1.interview_scores.id,
                interviewId: schema_1.interview_scores.interviewId,
                criterionId: schema_1.interview_scores.criterionId,
                score: schema_1.interview_scores.score,
                comment: schema_1.interview_scores.comment,
                submittedBy: schema_1.interview_scores.submittedBy,
            })
                .from(schema_1.interview_scores)
                .where((0, drizzle_orm_1.eq)(schema_1.interview_scores.interviewId, interviewId))
                .execute();
            const grouped = {};
            let globalTotal = 0;
            let globalCount = 0;
            for (const s of scores) {
                const key = s.submittedBy;
                if (!key)
                    continue;
                if (!grouped[key])
                    grouped[key] = { scores: [], average: 0 };
                grouped[key].scores.push(s);
                if (typeof s.score === 'number') {
                    globalTotal += s.score;
                    globalCount += 1;
                }
            }
            for (const k in grouped) {
                const values = grouped[k].scores
                    .map((s) => s.score)
                    .filter((v) => typeof v === 'number');
                const total = values.reduce((a, b) => a + b, 0);
                grouped[k].average = values.length
                    ? Number((total / values.length).toFixed(2))
                    : 0;
            }
            const overallAverage = globalCount
                ? Number((globalTotal / globalCount).toFixed(2))
                : 0;
            return { feedback: grouped, overallAverage };
        });
    }
    async upsertInterviewFeedback(interviewId, scores, user) {
        this.logger.info({ interviewId, count: scores?.length ?? 0, userId: user.id }, 'iv:feedback:upsert:start');
        const submittedBy = user.id;
        for (const s of scores) {
            const existing = await this.db
                .select({ id: schema_1.interview_scores.id })
                .from(schema_1.interview_scores)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.interview_scores.interviewId, interviewId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.criterionId, s.criterionId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.submittedBy, submittedBy)))
                .limit(1)
                .execute();
            if (existing.length > 0) {
                await this.db
                    .update(schema_1.interview_scores)
                    .set({ score: s.score, comment: s.comment })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.interview_scores.interviewId, interviewId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.criterionId, s.criterionId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.submittedBy, submittedBy)))
                    .execute();
            }
            else {
                await this.db
                    .insert(schema_1.interview_scores)
                    .values({
                    interviewId,
                    criterionId: s.criterionId,
                    score: s.score,
                    comment: s.comment,
                    submittedBy,
                })
                    .execute();
            }
        }
        await this.auditService.logAction({
            action: 'upsert',
            entity: 'interview_feedback',
            entityId: interviewId,
            userId: submittedBy,
            details: `Upserted feedback for interview ${interviewId}`,
            changes: {
                interviewId,
                scores: scores.map((s) => ({
                    criterionId: s.criterionId,
                    score: s.score,
                    comment: s.comment,
                })),
            },
        });
        await this.burst({ interviewId });
        this.logger.info({ interviewId }, 'iv:feedback:upsert:done');
        return { success: true };
    }
};
exports.InterviewsService = InterviewsService;
exports.InterviewsService = InterviewsService = InterviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], InterviewsService);
//# sourceMappingURL=interviews.service.js.map