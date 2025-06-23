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
exports.OnboardingSeederService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const onboarding_templates_schema_1 = require("./schema/onboarding-templates.schema");
const onboarding_template_checklists_schema_1 = require("./schema/onboarding-template-checklists.schema");
const onboarding_template_fields_schema_1 = require("./schema/onboarding-template-fields.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema");
let OnboardingSeederService = class OnboardingSeederService {
    constructor(db) {
        this.db = db;
    }
    async seedGlobalOnboardingTemplate() {
        await this.seedTemplate({
            name: 'Full-Time Employee Onboarding',
            description: 'Standard onboarding for full-time hires across all companies.',
            fields: [
                ['dateOfBirth', 'Date of Birth', 'date', 'profile'],
                ['gender', 'Gender', 'select', 'profile'],
                ['maritalStatus', 'Marital Status', 'select', 'profile'],
                ['address', 'Address', 'text', 'profile'],
                ['country', 'Country', 'text', 'profile'],
                ['phone', 'Phone', 'text', 'profile'],
                ['emergencyName', 'Emergency Contact Name', 'text', 'profile'],
                ['emergencyPhone', 'Emergency Contact Phone', 'text', 'profile'],
                ['bankName', 'Bank Name', 'select', 'finance'],
                ['bankAccountNumber', 'Bank Account Number', 'text', 'finance'],
                ['bankAccountName', 'Bank Account Name', 'text', 'finance'],
                ['bankBranch', 'Bank Branch', 'text', 'finance'],
                ['tin', 'Tax Identification Number (TIN)', 'text', 'finance'],
                ['pensionPin', 'Pension PIN', 'text', 'finance'],
                ['nhfNumber', 'NHF Number', 'text', 'finance'],
                ['idUpload', 'Upload Valid ID', 'file', 'document'],
            ],
            checklist: [
                'Fill Personal Details',
                'Add Bank and Tax Info',
                'Upload Valid ID',
                'Sign Offer Letter',
                'Attend onboarding call',
            ],
        });
    }
    async seedInternTemplate() {
        await this.seedTemplate({
            name: 'Intern Onboarding',
            description: 'Streamlined onboarding for internship hires.',
            fields: [
                ['dateOfBirth', 'Date of Birth', 'date', 'profile'],
                ['gender', 'Gender', 'select', 'profile'],
                ['maritalStatus', 'Marital Status', 'select', 'profile'],
                ['address', 'Address', 'text', 'profile'],
                ['country', 'Country', 'text', 'profile'],
                ['phone', 'Phone', 'text', 'profile'],
                ['bankName', 'Bank Name', 'select', 'finance'],
                ['bankAccountNumber', 'Bank Account Number', 'text', 'finance'],
                ['bankAccountName', 'Bank Account Name', 'text', 'finance'],
                ['bankBranch', 'Bank Branch', 'text', 'finance'],
                ['tin', 'Tax Identification Number (TIN)', 'text', 'finance'],
                ['pensionPin', 'Pension PIN', 'text', 'finance'],
                ['nhfNumber', 'NHF Number', 'text', 'finance'],
                ['emergencyName', 'Emergency Contact Name', 'text', 'profile'],
                ['emergencyPhone', 'Emergency Contact Phone', 'text', 'profile'],
                ['idUpload', 'Upload Student ID', 'file', 'document'],
            ],
            checklist: [
                'Fill Basic Personal Details',
                'Add Bank and Tax Info',
                'Upload Student ID',
                'Sign Offer Letter',
                'Attend onboarding call',
            ],
        });
    }
    async seedContractorTemplate() {
        await this.seedTemplate({
            name: 'Contract Staff Onboarding',
            description: 'Onboarding for external or contract-based employees.',
            fields: [
                ['dateOfBirth', 'Date of Birth', 'date', 'profile'],
                ['gender', 'Gender', 'select', 'profile'],
                ['phone', 'Phone', 'text', 'profile'],
                ['bankName', 'Bank Name', 'select', 'finance'],
                ['bankAccountNumber', 'Bank Account Number', 'text', 'finance'],
                ['bankAccountName', 'Bank Account Name', 'text', 'finance'],
                ['bankBranch', 'Bank Branch', 'text', 'finance'],
                ['tin', 'Tax Identification Number (TIN)', 'text', 'finance'],
                ['pensionPin', 'Pension PIN', 'text', 'finance'],
                ['nhfNumber', 'NHF Number', 'text', 'finance'],
                ['idUpload', 'Upload Signed Contract', 'file', 'document'],
            ],
            checklist: [
                'Complete Basic Info',
                'Add Bank and Tax Info',
                'Upload Signed Contract',
                'Sign Offer Letter',
                'Attend onboarding call',
            ],
        });
    }
    async seedAllGlobalTemplates() {
        await Promise.all([
            this.seedGlobalOnboardingTemplate(),
            this.seedInternTemplate(),
            this.seedContractorTemplate(),
        ]);
    }
    async seedTemplate({ name, description, fields, checklist, }) {
        const existing = await this.db.query.onboardingTemplates.findFirst({
            where: (template, { eq }) => eq(template.name, name),
        });
        if (existing) {
            return;
        }
        const [template] = await this.db
            .insert(onboarding_templates_schema_1.onboardingTemplates)
            .values({
            name,
            description,
            isGlobal: true,
            companyId: null,
            status: 'published',
            createdAt: new Date(),
        })
            .returning();
        if (!template)
            throw new common_1.BadRequestException(`Failed to insert template: ${name}`);
        await this.db.insert(onboarding_template_fields_schema_1.onboardingTemplateFields).values(fields.map((f, i) => ({
            templateId: template.id,
            fieldKey: f[0],
            label: f[1],
            fieldType: f[2],
            required: true,
            order: i + 1,
            tag: f[3],
        })));
        await this.db.insert(onboarding_template_checklists_schema_1.onboardingTemplateChecklists).values(checklist.map((title, i) => ({
            templateId: template.id,
            title,
            assignee: 'employee',
            order: i + 1,
            dueDaysAfterStart: i,
        })));
    }
    async cloneTemplateForCompany(globalTemplateId, companyId, templateName) {
        const globalTemplate = await this.db.query.onboardingTemplates.findFirst({
            where: (t, { eq, and }) => and(eq(t.id, globalTemplateId), eq(t.isGlobal, true)),
        });
        if (!globalTemplate) {
            throw new common_1.BadRequestException(`Global template not found`);
        }
        const existingTemplate = await this.db
            .select()
            .from(onboarding_templates_schema_1.onboardingTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.name, templateName || `${globalTemplate.name} (Cloned)`), (0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.isGlobal, false)))
            .execute();
        if (existingTemplate.length > 0) {
            throw new common_1.BadRequestException(`Template with name "${templateName || globalTemplate.name}" already exists for this company.`);
        }
        const [clonedTemplate] = await this.db
            .insert(onboarding_templates_schema_1.onboardingTemplates)
            .values({
            name: templateName || `${globalTemplate.name} (Cloned)`,
            description: globalTemplate.description,
            isGlobal: false,
            companyId,
            status: 'draft',
            createdAt: new Date(),
        })
            .returning();
        const fields = await this.db.query.onboardingTemplateFields.findMany({
            where: (f, { eq }) => eq(f.templateId, globalTemplate.id),
        });
        await this.db.insert(onboarding_template_fields_schema_1.onboardingTemplateFields).values(fields.map((field) => ({
            templateId: clonedTemplate.id,
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            required: field.required,
            order: field.order,
            tag: field.tag,
        })));
        const checklist = await this.db.query.onboardingTemplateChecklists.findMany({
            where: (c, { eq }) => eq(c.templateId, globalTemplate.id),
        });
        await this.db.insert(onboarding_template_checklists_schema_1.onboardingTemplateChecklists).values(checklist.map((item) => ({
            templateId: clonedTemplate.id,
            title: item.title,
            assignee: item.assignee,
            order: item.order,
            dueDaysAfterStart: item.dueDaysAfterStart,
        })));
        return clonedTemplate;
    }
    async createCompanyTemplate(companyId, dto) {
        const { name, description, fields, checklist } = dto;
        const existingTemplate = await this.db
            .select()
            .from(onboarding_templates_schema_1.onboardingTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.name, name), (0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.isGlobal, false)))
            .execute();
        if (existingTemplate.length > 0) {
            throw new common_1.BadRequestException(`Template with name "${name}" already exists for this company.`);
        }
        const [template] = await this.db
            .insert(onboarding_templates_schema_1.onboardingTemplates)
            .values({
            name,
            description,
            isGlobal: false,
            companyId,
            status: 'draft',
            createdAt: new Date(),
        })
            .returning();
        if (!template)
            throw new common_1.BadRequestException('Failed to create company template');
        if (fields.length) {
            await Promise.all(fields.map(async (f, i) => {
                await this.db.insert(onboarding_template_fields_schema_1.onboardingTemplateFields).values({
                    templateId: template.id,
                    fieldKey: f.fieldKey,
                    label: f.label,
                    fieldType: f.fieldType,
                    required: f.required ?? true,
                    order: f.order ?? i + 1,
                    tag: f.tag ?? 'profile',
                });
            }));
        }
        if (checklist.length) {
            await this.db.insert(onboarding_template_checklists_schema_1.onboardingTemplateChecklists).values(checklist.map((item, i) => ({
                templateId: template.id,
                title: item.title,
                assignee: item.assignee,
                dueDaysAfterStart: item.dueDaysAfterStart ?? 0,
                order: item.order ?? i + 1,
            })));
        }
        return template;
    }
    async updateTemplateById(templateId, dto) {
        const { name, description, fields, checklist } = dto;
        const existingTemplate = await this.db
            .select()
            .from(schema_1.employeeOnboarding)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.templateId, templateId), (0, drizzle_orm_1.eq)(schema_1.employeeOnboarding.status, 'pending')))
            .execute();
        if (existingTemplate.length > 0) {
            throw new common_1.BadRequestException(`Template is currently in use by employees. Cannot update.`);
        }
        await this.db
            .update(onboarding_templates_schema_1.onboardingTemplates)
            .set({ name, description })
            .where((0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.id, templateId));
        await this.db
            .delete(onboarding_template_fields_schema_1.onboardingTemplateFields)
            .where((0, drizzle_orm_1.eq)(onboarding_template_fields_schema_1.onboardingTemplateFields.templateId, templateId));
        await this.db.insert(onboarding_template_fields_schema_1.onboardingTemplateFields).values(fields.map((field, i) => ({
            templateId,
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            tag: field.tag,
            required: field.required,
            order: i,
        })));
        await this.db
            .delete(onboarding_template_checklists_schema_1.onboardingTemplateChecklists)
            .where((0, drizzle_orm_1.eq)(onboarding_template_checklists_schema_1.onboardingTemplateChecklists.templateId, templateId));
        await this.db.insert(onboarding_template_checklists_schema_1.onboardingTemplateChecklists).values(checklist.map((item, i) => ({
            templateId,
            title: item.title,
            assignee: item.assignee,
            dueDaysAfterStart: item.dueDaysAfterStart,
            order: i,
        })));
        return { status: 'success' };
    }
    async getTemplatesByCompanySummaries(companyId) {
        const templates = await this.db
            .select({
            id: onboarding_templates_schema_1.onboardingTemplates.id,
            name: onboarding_templates_schema_1.onboardingTemplates.name,
        })
            .from(onboarding_templates_schema_1.onboardingTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.isGlobal, false)))
            .orderBy((0, drizzle_orm_1.asc)(onboarding_templates_schema_1.onboardingTemplates.createdAt));
        return templates;
    }
    async getTemplatesByCompany(companyId) {
        const templates = await this.db
            .select()
            .from(onboarding_templates_schema_1.onboardingTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.companyId, companyId), (0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.isGlobal, false)))
            .orderBy((0, drizzle_orm_1.asc)(onboarding_templates_schema_1.onboardingTemplates.createdAt));
        const templateSummaries = await Promise.all(templates.map(async (template) => {
            const fieldCount = await this.db
                .select()
                .from(onboarding_template_fields_schema_1.onboardingTemplateFields)
                .where((0, drizzle_orm_1.eq)(onboarding_template_fields_schema_1.onboardingTemplateFields.templateId, template.id))
                .then((res) => res.length);
            const checklistCount = await this.db
                .select()
                .from(onboarding_template_checklists_schema_1.onboardingTemplateChecklists)
                .where((0, drizzle_orm_1.eq)(onboarding_template_checklists_schema_1.onboardingTemplateChecklists.templateId, template.id))
                .then((res) => res.length);
            return {
                ...template,
                fieldCount,
                checklistCount,
            };
        }));
        const globalTemplates = await this.db
            .select()
            .from(onboarding_templates_schema_1.onboardingTemplates)
            .where((0, drizzle_orm_1.eq)(onboarding_templates_schema_1.onboardingTemplates.isGlobal, true))
            .orderBy((0, drizzle_orm_1.asc)(onboarding_templates_schema_1.onboardingTemplates.createdAt));
        return { templateSummaries, globalTemplates };
    }
    async getTemplatesByCompanyWithDetails(companyId) {
        const templates = await this.getTemplatesByCompany(companyId);
        const templateDetails = await Promise.all(templates.templateSummaries.map(async (template) => {
            const fields = await this.db.query.onboardingTemplateFields.findMany({
                where: (f, { eq }) => eq(f.templateId, template.id),
                orderBy: (f, { asc }) => asc(f.order),
            });
            const checklist = await this.db.query.onboardingTemplateChecklists.findMany({
                where: (c, { eq }) => eq(c.templateId, template.id),
                orderBy: (c, { asc }) => asc(c.order),
            });
            return {
                ...template,
                fields,
                checklist,
            };
        }));
        return templateDetails;
    }
    async getTemplateByIdWithDetails(templateId) {
        const template = await this.db.query.onboardingTemplates.findFirst({
            where: (t, { eq }) => eq(t.id, templateId),
        });
        if (!template) {
            throw new Error('Template not found');
        }
        const fields = await this.db.query.onboardingTemplateFields.findMany({
            where: (f, { eq }) => eq(f.templateId, templateId),
            orderBy: (f, { asc }) => asc(f.order),
        });
        const checklist = await this.db.query.onboardingTemplateChecklists.findMany({
            where: (c, { eq }) => eq(c.templateId, templateId),
            orderBy: (c, { asc }) => asc(c.order),
        });
        return {
            ...template,
            fields,
            checklist,
        };
    }
};
exports.OnboardingSeederService = OnboardingSeederService;
exports.OnboardingSeederService = OnboardingSeederService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], OnboardingSeederService);
//# sourceMappingURL=seeder.service.js.map