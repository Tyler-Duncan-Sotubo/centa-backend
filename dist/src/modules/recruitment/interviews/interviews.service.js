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
exports.InterviewsService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema");
const audit_service_1 = require("../../audit/audit.service");
let InterviewsService = class InterviewsService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async scheduleInterview(dto) {
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
            .returning();
        const assignments = dto.interviewerIds.map((id) => ({
            interviewId: interview.id,
            interviewerId: id,
            scorecardTemplateId: dto.scorecardTemplateId,
        }));
        await this.db.insert(schema_1.interviewInterviewers).values(assignments);
        return interview;
    }
    async rescheduleInterview(interviewId, dto) {
        const [interview] = await this.db
            .update(schema_1.interviews)
            .set({
            scheduledFor: new Date(dto.scheduledFor),
            durationMins: dto.durationMins,
            stage: dto.stage,
            meetingLink: dto.meetingLink,
            mode: dto.mode,
            eventId: dto.eventId,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.interviews.id, interviewId))
            .returning();
        await this.db
            .delete(schema_1.interviewInterviewers)
            .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interviewId));
        const assignments = dto.interviewerIds.map((id) => ({
            interviewId: interview.id,
            interviewerId: id,
            scorecardTemplateId: dto.scorecardTemplateId,
        }));
        await this.db.insert(schema_1.interviewInterviewers).values(assignments);
        return interview;
    }
    async findAllInterviews(companyId) {
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
            .where((0, drizzle_orm_1.eq)(schema_1.job_postings.companyId, companyId));
        if (allInterviews.length === 0)
            return [];
        const results = await Promise.all(allInterviews.map(async ({ interview, candidate }) => {
            const interviewers = await this.db
                .select({
                interviewerId: schema_1.interviewInterviewers.interviewerId,
                scorecardTemplateId: schema_1.interviewInterviewers.scorecardTemplateId,
            })
                .from(schema_1.interviewInterviewers)
                .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interview.id));
            const templateIds = [
                ...new Set(interviewers.map((i) => i.scorecardTemplateId).filter(Boolean)),
            ];
            const criteria = templateIds.length > 0
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
                    .where((0, drizzle_orm_1.inArray)(schema_1.scorecard_criteria.templateId, templateIds.filter((id) => id !== null)))
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
        return results;
    }
    async getInterviewDetails(interviewId) {
        const [interview] = await this.db
            .select()
            .from(schema_1.interviews)
            .where((0, drizzle_orm_1.eq)(schema_1.interviews.id, interviewId));
        if (!interview)
            throw new common_1.NotFoundException('Interview not found');
        const interviewers = await this.db
            .select()
            .from(schema_1.interviewInterviewers)
            .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interviewId));
        const templateIds = [
            ...new Set(interviewers.map((i) => i.scorecardTemplateId).filter(Boolean)),
        ];
        const criteria = await this.db
            .select()
            .from(schema_1.scorecard_criteria)
            .where((0, drizzle_orm_1.inArray)(schema_1.scorecard_criteria.templateId, templateIds.filter((id) => id !== null)));
        const criteriaByTemplate = {};
        for (const c of criteria) {
            if (!criteriaByTemplate[c.templateId]) {
                criteriaByTemplate[c.templateId] = [];
            }
            criteriaByTemplate[c.templateId].push(c);
        }
        return {
            ...interview,
            interviewers,
            scorecardCriteria: criteriaByTemplate,
        };
    }
    async listInterviewsForApplication(applicationId) {
        return this.db
            .select()
            .from(schema_1.interviews)
            .where((0, drizzle_orm_1.eq)(schema_1.interviews.applicationId, applicationId))
            .orderBy(schema_1.interviews.scheduledFor);
    }
    async listInterviewerFeedback(interviewId) {
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
            .where((0, drizzle_orm_1.eq)(schema_1.interview_scores.interviewId, interviewId));
        const grouped = {};
        let globalTotal = 0;
        let globalCount = 0;
        for (const score of scores) {
            const key = score.submittedBy;
            if (key == null)
                continue;
            if (!grouped[key]) {
                grouped[key] = {
                    scores: [],
                    average: 0,
                };
            }
            grouped[key].scores.push(score);
            if (typeof score.score === 'number') {
                globalTotal += score.score;
                globalCount += 1;
            }
        }
        for (const key in grouped) {
            const values = grouped[key].scores.map((s) => s.score).filter(Boolean);
            const total = values.reduce((a, b) => a + b, 0);
            const average = values.length > 0 ? total / values.length : 0;
            grouped[key].average = Number(average.toFixed(2));
        }
        const overallAverage = globalCount > 0 ? Number((globalTotal / globalCount).toFixed(2)) : 0;
        return {
            feedback: grouped,
            overallAverage,
        };
    }
    async upsertInterviewFeedback(interviewId, scores, user) {
        const submittedBy = user.id;
        for (const s of scores) {
            const existing = await this.db
                .select()
                .from(schema_1.interview_scores)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.interview_scores.interviewId, interviewId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.criterionId, s.criterionId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.submittedBy, submittedBy)))
                .limit(1);
            if (existing.length > 0) {
                await this.db
                    .update(schema_1.interview_scores)
                    .set({
                    score: s.score,
                    comment: s.comment,
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.interview_scores.interviewId, interviewId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.criterionId, s.criterionId), (0, drizzle_orm_1.eq)(schema_1.interview_scores.submittedBy, submittedBy)));
            }
            else {
                await this.db.insert(schema_1.interview_scores).values({
                    interviewId,
                    criterionId: s.criterionId,
                    score: s.score,
                    comment: s.comment,
                    submittedBy,
                });
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
        return { success: true };
    }
};
exports.InterviewsService = InterviewsService;
exports.InterviewsService = InterviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], InterviewsService);
//# sourceMappingURL=interviews.service.js.map