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
var ApplicationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../schema");
const aws_service_1 = require("../../../common/aws/aws.service");
const resume_scoring_service_1 = require("./resume-scoring.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const schema_2 = require("../../../drizzle/schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let ApplicationsService = ApplicationsService_1 = class ApplicationsService {
    constructor(db, queue, awsService, auditService, resumeScoring, logger, cache) {
        this.db = db;
        this.queue = queue;
        this.awsService = awsService;
        this.auditService = auditService;
        this.resumeScoring = resumeScoring;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(ApplicationsService_1.name);
    }
    appDetailKey(appId) {
        return `apps:detail:${appId}`;
    }
    kanbanKey(jobId) {
        return `apps:job:${jobId}:kanban`;
    }
    appHistoryKey(appId) {
        return `apps:${appId}:history`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.appId) {
            jobs.push(this.cache.del(this.appDetailKey(opts.appId)));
            jobs.push(this.cache.del(this.appHistoryKey(opts.appId)));
        }
        if (opts.jobId)
            jobs.push(this.cache.del(this.kanbanKey(opts.jobId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:applications');
    }
    async submitApplication(dto, user) {
        const { jobId } = dto;
        this.logger.info({ jobId }, 'apps:submit:start');
        const [form] = await this.db
            .select()
            .from(schema_1.application_form_configs)
            .where((0, drizzle_orm_1.eq)(schema_1.application_form_configs.jobId, jobId))
            .execute();
        if (!form) {
            this.logger.warn({ jobId }, 'apps:submit:no-form');
            throw new common_1.NotFoundException('No application form found for this job');
        }
        const fieldResponses = dto.fieldResponses ?? [];
        const extractField = (label) => fieldResponses.find((f) => f.label.toLowerCase() === label.toLowerCase())
            ?.value;
        const email = extractField('Email Address');
        const fullName = extractField('Full Name');
        const phone = extractField('Phone Number');
        const skillsRaw = extractField('Skills');
        if (!email || !fullName) {
            this.logger.warn({ jobId }, 'apps:submit:missing-required');
            throw new common_1.BadRequestException('Full Name and Email Address are required');
        }
        dto.fieldResponses = await this.handleFileUploads(dto.fieldResponses ?? [], email);
        const resumeField = dto.fieldResponses.find((f) => f.label.toLowerCase() === 'resume/cv');
        const resumeUrl = resumeField?.value;
        let [candidate] = await this.db
            .select()
            .from(schema_1.candidates)
            .where((0, drizzle_orm_1.eq)(schema_1.candidates.email, email))
            .execute();
        if (!candidate) {
            [candidate] = await this.db
                .insert(schema_1.candidates)
                .values({
                fullName,
                email,
                phone,
                source: dto.candidateSource || 'career_page',
                resumeUrl,
                createdAt: new Date(),
                profile: { fieldResponses: dto.fieldResponses },
            })
                .returning()
                .execute();
            this.logger.debug({ candidateId: candidate.id }, 'apps:submit:candidate:created');
        }
        const skillsList = skillsRaw
            ?.split(',')
            .map((s) => s.trim())
            .filter(Boolean) || [];
        if (skillsList.length) {
            const insertedSkills = await this.ensureSkillsExist(skillsList);
            const existingLinks = await this.db
                .select({ skillId: schema_1.candidate_skills.skillId })
                .from(schema_1.candidate_skills)
                .where((0, drizzle_orm_1.eq)(schema_1.candidate_skills.candidateId, candidate.id))
                .execute();
            const existingSkillIds = new Set(existingLinks.map((s) => s.skillId));
            const newLinks = insertedSkills
                .filter((skill) => !existingSkillIds.has(skill.id))
                .map((skill) => ({ candidateId: candidate.id, skillId: skill.id }));
            if (newLinks.length > 0)
                await this.db.insert(schema_1.candidate_skills).values(newLinks).execute();
        }
        const [firstStage] = await this.db
            .select()
            .from(schema_1.pipeline_stages)
            .where((0, drizzle_orm_1.eq)(schema_1.pipeline_stages.jobId, jobId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.pipeline_stages.order))
            .limit(1)
            .execute();
        const [application] = await this.db
            .insert(schema_1.applications)
            .values({
            candidateId: candidate.id,
            jobId,
            source: dto.applicationSource || 'career_page',
            currentStage: firstStage?.id,
            appliedAt: new Date(),
        })
            .returning()
            .execute();
        if (dto.fieldResponses?.length) {
            await this.db
                .insert(schema_1.application_field_responses)
                .values(dto.fieldResponses.map((f) => ({
                applicationId: application.id,
                label: f.label,
                value: f.value,
                required: true,
                createdAt: new Date(),
            })))
                .execute();
        }
        const questionResponses = dto.questionResponses ?? [];
        if (questionResponses.length) {
            await this.db
                .insert(schema_1.application_question_responses)
                .values(questionResponses.map((q) => ({
                applicationId: application.id,
                question: q.question,
                answer: q.answer,
                createdAt: new Date(),
            })))
                .execute();
        }
        if (firstStage) {
            await this.db
                .insert(schema_1.pipeline_stage_instances)
                .values({
                applicationId: application.id,
                stageId: firstStage.id,
                enteredAt: new Date(),
            })
                .execute();
        }
        await this.db
            .insert(schema_1.application_history)
            .values({
            applicationId: application.id,
            fromStatus: 'applied',
            toStatus: 'applied',
            changedAt: new Date(),
            notes: 'Application submitted',
        })
            .execute();
        const [job] = await this.db
            .select({
            title: schema_1.job_postings.title,
            responsibilities: schema_1.job_postings.responsibilities,
            requirements: schema_1.job_postings.requirements,
        })
            .from(schema_1.job_postings)
            .where((0, drizzle_orm_1.eq)(schema_1.job_postings.id, jobId))
            .execute();
        if (job && resumeUrl) {
            await this.queue.add('score-resume', {
                resumeUrl,
                job,
                applicationId: application.id,
            });
        }
        await this.auditService.logAction({
            action: 'create',
            entity: 'application',
            entityId: application.id,
            details: 'Application submitted',
            userId: user.id,
            changes: { jobId, candidateId: candidate.id },
        });
        await this.burst({ appId: application.id, jobId });
        this.logger.info({ applicationId: application.id }, 'apps:submit:done');
        return { success: true, applicationId: application.id };
    }
    async getApplicationDetails(applicationId) {
        const key = this.appDetailKey(applicationId);
        this.logger.debug({ key, applicationId }, 'apps:detail:cache:get');
        const payload = await this.cache.getOrSetCache(key, async () => {
            const [application] = await this.db
                .select()
                .from(schema_1.applications)
                .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
                .execute();
            if (!application)
                return null;
            const [candidate, fieldResponses, questionResponses, stageHistory] = await Promise.all([
                this.db
                    .select()
                    .from(schema_1.candidates)
                    .where((0, drizzle_orm_1.eq)(schema_1.candidates.id, application.candidateId))
                    .then((res) => res[0]),
                this.db
                    .select({
                    label: schema_1.application_field_responses.label,
                    value: schema_1.application_field_responses.value,
                })
                    .from(schema_1.application_field_responses)
                    .where((0, drizzle_orm_1.eq)(schema_1.application_field_responses.applicationId, applicationId))
                    .execute(),
                this.db
                    .select({
                    question: schema_1.application_question_responses.question,
                    answer: schema_1.application_question_responses.answer,
                })
                    .from(schema_1.application_question_responses)
                    .where((0, drizzle_orm_1.eq)(schema_1.application_question_responses.applicationId, applicationId))
                    .execute(),
                this.db
                    .select({
                    name: schema_1.pipeline_stages.name,
                    movedAt: schema_1.pipeline_history.movedAt,
                    movedBy: (0, drizzle_orm_1.sql) `concat(${schema_2.users.firstName}, ' ', ${schema_2.users.lastName})`,
                })
                    .from(schema_1.pipeline_history)
                    .innerJoin(schema_1.pipeline_stages, (0, drizzle_orm_1.eq)(schema_1.pipeline_history.stageId, schema_1.pipeline_stages.id))
                    .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.pipeline_history.movedBy, schema_2.users.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.pipeline_history.applicationId, applicationId))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pipeline_history.movedAt))
                    .execute(),
            ]);
            const interview = await this.db
                .select()
                .from(schema_1.interviews)
                .where((0, drizzle_orm_1.eq)(schema_1.interviews.applicationId, applicationId))
                .then((res) => res[0]);
            let interviewers = [];
            if (interview) {
                const rawInterviewers = await this.db
                    .select({
                    id: schema_2.users.id,
                    name: (0, drizzle_orm_1.sql) `concat(${schema_2.users.firstName}, ' ', ${schema_2.users.lastName})`,
                    email: schema_2.users.email,
                    scorecardTemplateId: schema_1.interviewInterviewers.scorecardTemplateId,
                })
                    .from(schema_1.interviewInterviewers)
                    .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewerId, schema_2.users.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.interviewInterviewers.interviewId, interview.id))
                    .execute();
                interviewers = rawInterviewers.map((row) => ({
                    id: row.id,
                    name: String(row.name),
                    email: row.email,
                }));
                const templateIds = [
                    ...new Set(rawInterviewers.map((i) => i.scorecardTemplateId).filter(Boolean)),
                ];
                const criteria = templateIds.length
                    ? await this.db
                        .select({
                        criterionId: schema_1.scorecard_criteria.id,
                        label: schema_1.scorecard_criteria.label,
                        description: schema_1.scorecard_criteria.description,
                        maxScore: schema_1.scorecard_criteria.maxScore,
                        order: schema_1.scorecard_criteria.order,
                        templateId: schema_1.scorecard_criteria.templateId,
                        templateName: schema_1.scorecard_templates.name,
                        templateDescription: schema_1.scorecard_templates.description,
                    })
                        .from(schema_1.scorecard_criteria)
                        .innerJoin(schema_1.scorecard_templates, (0, drizzle_orm_1.eq)(schema_1.scorecard_criteria.templateId, schema_1.scorecard_templates.id))
                        .where((0, drizzle_orm_1.inArray)(schema_1.scorecard_criteria.templateId, templateIds))
                        .execute()
                    : [];
                const grouped = {};
                for (const c of criteria) {
                    if (!grouped[c.templateId])
                        grouped[c.templateId] = {
                            name: c.templateName,
                            description: c.templateDescription ?? '',
                            criteria: [],
                        };
                    grouped[c.templateId].criteria.push({
                        criterionId: c.criterionId,
                        label: c.label,
                        description: c.description,
                        maxScore: c.maxScore,
                        order: c.order,
                    });
                }
                interviewers = rawInterviewers.map((row) => {
                    const scorecard = row.scorecardTemplateId && grouped[row.scorecardTemplateId]
                        ? {
                            templateId: row.scorecardTemplateId,
                            name: grouped[row.scorecardTemplateId].name,
                            description: grouped[row.scorecardTemplateId].description,
                            criteria: grouped[row.scorecardTemplateId].criteria,
                        }
                        : null;
                    return {
                        id: row.id,
                        name: String(row.name),
                        email: row.email,
                        scorecard,
                    };
                });
            }
            return {
                application,
                candidate,
                fieldResponses,
                questionResponses,
                stageHistory,
                interview: interview ? { ...interview, interviewers } : null,
            };
        });
        if (!payload) {
            this.logger.warn({ applicationId }, 'apps:detail:not-found');
            throw new common_1.NotFoundException('Application not found');
        }
        return payload;
    }
    async listApplicationsByJobKanban(jobId) {
        const key = this.kanbanKey(jobId);
        this.logger.debug({ key, jobId }, 'apps:kanban:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const stages = await this.db
                .select()
                .from(schema_1.pipeline_stages)
                .where((0, drizzle_orm_1.eq)(schema_1.pipeline_stages.jobId, jobId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.pipeline_stages.order))
                .execute();
            const result = await Promise.all(stages.map(async (stage) => {
                const rawApps = await this.db
                    .select({
                    applicationId: schema_1.applications.id,
                    candidateId: schema_1.candidates.id,
                    fullName: schema_1.candidates.fullName,
                    email: schema_1.candidates.email,
                    appliedAt: schema_1.applications.appliedAt,
                    status: schema_1.applications.status,
                    appSource: schema_1.applications.source,
                    resumeScore: schema_1.applications.resumeScore,
                })
                    .from(schema_1.applications)
                    .innerJoin(schema_1.candidates, (0, drizzle_orm_1.eq)(schema_1.applications.candidateId, schema_1.candidates.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.applications.jobId, jobId), (0, drizzle_orm_1.eq)(schema_1.applications.currentStage, stage.id), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(schema_1.applications.status, 'rejected'))))
                    .orderBy(schema_1.applications.appliedAt)
                    .execute();
                const applicationsWithSkills = await Promise.all(rawApps.map(async (app) => {
                    const skillRows = await this.db
                        .select({ name: schema_1.skills.name })
                        .from(schema_1.candidate_skills)
                        .innerJoin(schema_1.skills, (0, drizzle_orm_1.eq)(schema_1.candidate_skills.skillId, schema_1.skills.id))
                        .where((0, drizzle_orm_1.eq)(schema_1.candidate_skills.candidateId, app.candidateId))
                        .limit(3)
                        .execute();
                    return { ...app, skills: skillRows.map((s) => s.name) };
                }));
                return {
                    stageId: stage.id,
                    stageName: stage.name,
                    applications: applicationsWithSkills,
                };
            }));
            this.logger.debug({ jobId, stages: result.length }, 'apps:kanban:db:done');
            return result;
        });
    }
    async moveToStage(dto, user) {
        const { applicationId, newStageId, feedback } = dto;
        this.logger.info({ applicationId, newStageId, userId: user.id }, 'apps:moveToStage:start');
        await this.db
            .update(schema_1.applications)
            .set({ currentStage: newStageId })
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        await this.db
            .insert(schema_1.pipeline_history)
            .values({
            applicationId,
            stageId: newStageId,
            movedAt: new Date(),
            movedBy: user.id,
            feedback,
        })
            .execute();
        await this.db
            .insert(schema_1.pipeline_stage_instances)
            .values({ applicationId, stageId: newStageId, enteredAt: new Date() })
            .execute();
        await this.auditService.logAction({
            action: 'move_to_stage',
            entity: 'application',
            entityId: applicationId,
            userId: user.id,
            details: 'Moved to stage ' + newStageId,
            changes: { toStage: newStageId },
        });
        const [row] = await this.db
            .select({ jobId: schema_1.applications.jobId })
            .from(schema_1.applications)
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        await this.burst({ appId: applicationId, jobId: row?.jobId });
        this.logger.info({ applicationId }, 'apps:moveToStage:done');
        return { success: true };
    }
    async changeStatus(dto, user) {
        const { applicationId, newStatus, notes } = dto;
        this.logger.info({ applicationId, newStatus, userId: user.id }, 'apps:changeStatus:start');
        const [app] = await this.db
            .select()
            .from(schema_1.applications)
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        if (!app) {
            this.logger.warn({ applicationId }, 'apps:changeStatus:not-found');
            throw new common_1.NotFoundException('Application not found');
        }
        await this.db
            .update(schema_1.applications)
            .set({ status: newStatus })
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        await this.db
            .insert(schema_1.application_history)
            .values({
            applicationId,
            fromStatus: app.status,
            toStatus: newStatus,
            changedBy: user.id,
            changedAt: new Date(),
            notes,
        })
            .execute();
        await this.auditService.logAction({
            action: 'change_status',
            entity: 'application',
            entityId: applicationId,
            userId: user.id,
            details: `Changed status from ${app.status} to ${newStatus}`,
            changes: { fromStatus: app.status, toStatus: newStatus },
        });
        const [row] = await this.db
            .select({ jobId: schema_1.applications.jobId })
            .from(schema_1.applications)
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId))
            .execute();
        await this.burst({ appId: applicationId, jobId: row?.jobId });
        this.logger.info({ applicationId }, 'apps:changeStatus:done');
        return { success: true };
    }
    async ensureSkillsExist(skillNames) {
        if (!skillNames.length)
            return [];
        const normalized = skillNames.map((s) => s.trim());
        const existing = await this.db
            .select()
            .from(schema_1.skills)
            .where((0, drizzle_orm_1.inArray)(schema_1.skills.name, normalized))
            .execute();
        const existingNames = new Set(existing.map((s) => s.name));
        const missing = normalized.filter((name) => !existingNames.has(name));
        let inserted = [];
        if (missing.length > 0) {
            inserted = await this.db
                .insert(schema_1.skills)
                .values(missing.map((name) => ({ name })))
                .returning()
                .execute();
        }
        return [...existing, ...inserted];
    }
    async handleFileUploads(fieldResponses, email) {
        const updatedResponses = await Promise.all((fieldResponses ?? []).map(async (field) => {
            if (field.fieldType === 'file' && field.value?.startsWith('data:')) {
                const [meta, base64Data] = field.value.split(',');
                const isPdf = meta.includes('application/pdf');
                const buffer = Buffer.from(base64Data, 'base64');
                const extension = isPdf
                    ? 'pdf'
                    : meta.includes('png')
                        ? 'png'
                        : 'jpg';
                const fileName = `${field.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${extension}`;
                let fileUrl;
                if (isPdf) {
                    fileUrl = await this.awsService.uploadPdfToS3(email, fileName, buffer);
                }
                else {
                    fileUrl = await this.awsService.uploadImageToS3(email, fileName, buffer);
                }
                return { ...field, value: fileUrl };
            }
            return field;
        }));
        return updatedResponses;
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = ApplicationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('resumeScoringQueue')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue,
        aws_service_1.AwsService,
        audit_service_1.AuditService,
        resume_scoring_service_1.ResumeScoringService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map