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
var InterviewEmailTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewEmailTemplateService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const interview_email_templates_schema_1 = require("./schema/interview-email-templates.schema");
const interviews_schema_1 = require("./schema/interviews.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let InterviewEmailTemplateService = InterviewEmailTemplateService_1 = class InterviewEmailTemplateService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(InterviewEmailTemplateService_1.name);
    }
    listKey(companyId) {
        return `ivemail:${companyId}:templates:list`;
    }
    detailKey(templateId) {
        return `ivemail:template:${templateId}:detail`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
        if (opts.templateId)
            jobs.push(this.cache.del(this.detailKey(opts.templateId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:interview-email');
    }
    async getAllTemplates(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'ivemail:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(interview_email_templates_schema_1.interviewEmailTemplates)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId), (0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.companyId, companyId)))
                .groupBy(interview_email_templates_schema_1.interviewEmailTemplates.id)
                .orderBy((0, drizzle_orm_1.asc)(interview_email_templates_schema_1.interviewEmailTemplates.createdAt))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'ivemail:list:db:done');
            return rows;
        });
    }
    async getOne(templateId, companyId) {
        const key = this.detailKey(templateId);
        this.logger.debug({ key, templateId }, 'ivemail:detail:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [tmpl] = await this.db
                .select()
                .from(interview_email_templates_schema_1.interviewEmailTemplates)
                .where(companyId
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId), (0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.companyId, companyId)))
                : (0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId))
                .execute();
            return tmpl ?? null;
        });
        if (!row) {
            this.logger.warn({ templateId }, 'ivemail:detail:not-found');
            throw new common_1.NotFoundException('Template not found');
        }
        return row;
    }
    async create(user, dto) {
        const { companyId, id } = user;
        this.logger.info({ companyId, name: dto?.name }, 'ivemail:create:start');
        const [template] = await this.db
            .insert(interview_email_templates_schema_1.interviewEmailTemplates)
            .values({ ...dto, companyId: companyId, isGlobal: false, createdBy: id })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'email',
            entityId: template.id,
            userId: id,
            details: 'Created email template',
            changes: {
                name: template.name,
                subject: template.subject,
                body: template.body,
                isGlobal: template.isGlobal,
                companyId: template.companyId,
                createdBy: template.createdBy,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt,
            },
        });
        await this.burst({ companyId, templateId: template.id });
        this.logger.info({ id: template.id }, 'ivemail:create:done');
        return template;
    }
    async cloneTemplate(templateId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'ivemail:clone:start');
        const [template] = await this.db
            .select()
            .from(interview_email_templates_schema_1.interviewEmailTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId), (0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId)))
            .execute();
        if (!template) {
            this.logger.warn({ templateId }, 'ivemail:clone:not-found');
            throw new common_1.NotFoundException('System template not found');
        }
        const [cloned] = await this.db
            .insert(interview_email_templates_schema_1.interviewEmailTemplates)
            .values({
            name: `${template.name} (Copy)`,
            subject: template.subject,
            body: template.body,
            createdBy: id,
            companyId,
            isGlobal: false,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'clone',
            entity: 'email',
            entityId: cloned.id,
            userId: id,
            details: 'Cloned email template',
            changes: {
                name: cloned.name,
                subject: cloned.subject,
                body: cloned.body,
                isGlobal: cloned.isGlobal,
                companyId: cloned.companyId,
                createdBy: cloned.createdBy,
            },
        });
        await this.burst({ companyId, templateId: cloned.id });
        this.logger.info({ id: cloned.id }, 'ivemail:clone:done');
        return cloned;
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'ivemail:delete:start');
        const template = await this.db.query.interviewEmailTemplates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId), (0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.companyId, companyId))),
        });
        if (!template) {
            this.logger.warn({ templateId }, 'ivemail:delete:not-found');
            throw new common_1.NotFoundException(`Template not found`);
        }
        if (template.isGlobal) {
            this.logger.warn({ templateId }, 'ivemail:delete:is-global');
            throw new common_1.BadRequestException(`System templates cannot be deleted`);
        }
        const inUse = await this.db.query.interviews.findFirst({
            where: (0, drizzle_orm_1.eq)(interviews_schema_1.interviews.emailTemplateId, templateId),
        });
        if (inUse) {
            this.logger.warn({ templateId }, 'ivemail:delete:in-use');
            throw new common_1.BadRequestException(`Cannot delete: This template is being used in one or more interviews`);
        }
        await this.db
            .delete(interview_email_templates_schema_1.interviewEmailTemplates)
            .where((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'email',
            entityId: templateId,
            userId: id,
            details: 'Deleted email template',
            changes: {
                name: template.name,
                subject: template.subject,
                body: template.body,
                isGlobal: template.isGlobal,
                companyId: template.companyId,
                createdBy: template.createdBy,
            },
        });
        await this.burst({ companyId, templateId });
        this.logger.info({ templateId }, 'ivemail:delete:done');
        return { message: 'Template deleted successfully' };
    }
    async seedSystemEmailTemplates() {
        this.logger.info({}, 'ivemail:seed:start');
        const templates = [
            {
                name: 'Default Interview Invite',
                subject: 'Interview Invitation at {{companyName}}',
                body: `Dear {{candidateName}},\n\nWe’re pleased to invite you to the {{stage}} interview for the {{jobTitle}} position at {{companyName}}.\n\n📅 Scheduled Date: {{interviewDate}}\n🕒 Time: {{interviewTime}}\n💬 Mode: {{interviewMode}}\n🔗 Meeting Link: {{meetingLink}}\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,  \n{{recruiterName}}  \n{{companyName}} Recruitment Team`,
            },
            {
                name: 'Interview Reschedule Notice',
                subject: 'Your Interview Has Been Rescheduled',
                body: `Hi {{candidateName}},\n\nYour interview for the {{jobTitle}} role has been rescheduled.\n\n📅 New Date: {{interviewDate}}  \n🕒 Time: {{interviewTime}}  \n🔗 Updated Link: {{meetingLink}}\n\nSorry for any inconvenience, and thank you for your flexibility.\n\nRegards,  \n{{recruiterName}}  \n{{companyName}}`,
            },
            {
                name: 'Onsite Interview Preparation',
                subject: 'Preparing for Your Onsite Interview',
                body: `Hi {{candidateName}},\n\nWe’re excited to host you for the upcoming onsite interview at {{companyName}} for the {{jobTitle}} role.\n\n📍 Location: {{onsiteLocation}}  \n📅 Date: {{interviewDate}}  \n🕒 Time: {{interviewTime}}\n\nKindly bring along a valid ID and any relevant materials. Let us know if you need directions or assistance.\n\nBest,  \n{{recruiterName}}  \nTalent Team – {{companyName}}`,
            },
        ];
        for (const tmpl of templates) {
            await this.db
                .insert(interview_email_templates_schema_1.interviewEmailTemplates)
                .values({
                name: tmpl.name,
                subject: tmpl.subject,
                body: tmpl.body,
                isGlobal: true,
            })
                .execute();
        }
        await this.burst({});
        this.logger.info({}, 'ivemail:seed:done');
        return { success: true };
    }
};
exports.InterviewEmailTemplateService = InterviewEmailTemplateService;
exports.InterviewEmailTemplateService = InterviewEmailTemplateService = InterviewEmailTemplateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], InterviewEmailTemplateService);
//# sourceMappingURL=email-templates.service.js.map