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
exports.InterviewEmailTemplateService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const interview_email_templates_schema_1 = require("./schema/interview-email-templates.schema");
const interviews_schema_1 = require("./schema/interviews.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let InterviewEmailTemplateService = class InterviewEmailTemplateService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(scope) {
        return [`company:${scope}:emails`, `company:${scope}:emails:templates`];
    }
    async getAllTemplates(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['emails', 'templates', 'all'], async () => {
            const templates = await this.db
                .select()
                .from(interview_email_templates_schema_1.interviewEmailTemplates)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId), (0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.companyId, companyId)))
                .orderBy((0, drizzle_orm_1.asc)(interview_email_templates_schema_1.interviewEmailTemplates.createdAt))
                .execute();
            return templates;
        }, {
            tags: [...this.tags(companyId), ...this.tags('global')],
        });
    }
    async create(user, dto) {
        const { companyId, id } = user;
        const [template] = await this.db
            .insert(interview_email_templates_schema_1.interviewEmailTemplates)
            .values({
            ...dto,
            companyId,
            isGlobal: false,
            createdBy: id,
        })
            .returning();
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
        await this.cache.bumpCompanyVersion(companyId);
        return template;
    }
    async cloneTemplate(templateId, user) {
        const { companyId, id } = user;
        const [template] = await this.db
            .select()
            .from(interview_email_templates_schema_1.interviewEmailTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId), (0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId)))
            .execute();
        if (!template)
            throw new common_1.NotFoundException('System template not found');
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
            .returning();
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
        await this.cache.bumpCompanyVersion(companyId);
        return cloned;
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        const template = await this.db.query.interviewEmailTemplates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(interview_email_templates_schema_1.interviewEmailTemplates.companyId), (0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.companyId, companyId))),
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template not found`);
        }
        if (template.isGlobal) {
            throw new common_1.BadRequestException(`System templates cannot be deleted`);
        }
        const inUse = await this.db.query.interviews.findFirst({
            where: (0, drizzle_orm_1.eq)(interviews_schema_1.interviews.emailTemplateId, templateId),
        });
        if (inUse) {
            throw new common_1.BadRequestException(`Cannot delete: This template is being used in one or more interviews`);
        }
        await this.db
            .delete(interview_email_templates_schema_1.interviewEmailTemplates)
            .where((0, drizzle_orm_1.eq)(interview_email_templates_schema_1.interviewEmailTemplates.id, templateId));
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
        await this.cache.bumpCompanyVersion(companyId);
        return { message: 'Template deleted successfully' };
    }
    async seedSystemEmailTemplates() {
        const templates = [
            {
                name: 'Default Interview Invite',
                subject: 'Interview Invitation at {{companyName}}',
                body: `Dear {{candidateName}},
  
We’re pleased to invite you to the {{stage}} interview for the {{jobTitle}} position at {{companyName}}.

📅 Scheduled Date: {{interviewDate}}
🕒 Time: {{interviewTime}}
💬 Mode: {{interviewMode}}
🔗 Meeting Link: {{meetingLink}}

If you have any questions, feel free to reply to this email.

Best regards,
{{recruiterName}}
{{companyName}} Recruitment Team`,
            },
            {
                name: 'Interview Reschedule Notice',
                subject: 'Your Interview Has Been Rescheduled',
                body: `Hi {{candidateName}},

Your interview for the {{jobTitle}} role has been rescheduled.

📅 New Date: {{interviewDate}}
🕒 Time: {{interviewTime}}
🔗 Updated Link: {{meetingLink}}

Sorry for any inconvenience, and thank you for your flexibility.

Regards,
{{recruiterName}}
{{companyName}}`,
            },
            {
                name: 'Onsite Interview Preparation',
                subject: 'Preparing for Your Onsite Interview',
                body: `Hi {{candidateName}},

We’re excited to host you for the upcoming onsite interview at {{companyName}} for the {{jobTitle}} role.

📍 Location: {{onsiteLocation}}
📅 Date: {{interviewDate}}
🕒 Time: {{interviewTime}}

Kindly bring along a valid ID and any relevant materials. Let us know if you need directions or assistance.

Best,
{{recruiterName}}
Talent Team – {{companyName}}`,
            },
        ];
        for (const tmpl of templates) {
            await this.db.insert(interview_email_templates_schema_1.interviewEmailTemplates).values({
                name: tmpl.name,
                subject: tmpl.subject,
                body: tmpl.body,
                isGlobal: true,
            });
        }
        await this.cache.bumpCompanyVersion('global');
        return { success: true };
    }
};
exports.InterviewEmailTemplateService = InterviewEmailTemplateService;
exports.InterviewEmailTemplateService = InterviewEmailTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], InterviewEmailTemplateService);
//# sourceMappingURL=email-templates.service.js.map