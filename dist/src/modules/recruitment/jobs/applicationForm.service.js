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
exports.ApplicationFormService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const application_form_fields_schema_1 = require("./schema/application-form-fields.schema");
const application_form_questions_schema_1 = require("./schema/application-form-questions.schema");
const application_form_configs_schema_1 = require("./schema/application-form-configs.schema");
const drizzle_orm_1 = require("drizzle-orm");
const application_field_definitions_schema_1 = require("./schema/application-field-definitions.schema");
let ApplicationFormService = class ApplicationFormService {
    constructor(db) {
        this.db = db;
    }
    async seedDefaultFields() {
        await this.db.insert(application_field_definitions_schema_1.application_field_definitions).values(defaultFields.map((field, index) => ({
            section: field.section,
            label: field.label,
            fieldType: field.fieldType,
            required: field.required,
            isVisible: field.isVisible ?? true,
            isEditable: field.isEditable ?? true,
            order: index + 1,
        })));
    }
    async getDefaultFields() {
        const fields = await this.db.select().from(application_field_definitions_schema_1.application_field_definitions);
        if (fields.length === 0) {
            throw new common_1.NotFoundException('No default fields found');
        }
        return fields;
    }
    async upsertApplicationForm(jobId, user, config) {
        const existing = await this.db
            .select()
            .from(application_form_configs_schema_1.application_form_configs)
            .where((0, drizzle_orm_1.eq)(application_form_configs_schema_1.application_form_configs.jobId, jobId));
        let formId;
        if (existing.length > 0) {
            formId = existing[0].id;
            await this.db
                .update(application_form_configs_schema_1.application_form_configs)
                .set({
                style: config.style,
                includeReferences: config.includeReferences ?? false,
            })
                .where((0, drizzle_orm_1.eq)(application_form_configs_schema_1.application_form_configs.id, formId));
        }
        else {
            const [form] = await this.db
                .insert(application_form_configs_schema_1.application_form_configs)
                .values({
                jobId,
                style: config.style,
                includeReferences: config.includeReferences ?? false,
            })
                .returning();
            formId = form.id;
            console.log('Created new application form config:', formId);
        }
        if (config.customFields?.length) {
            await this.db.insert(application_form_fields_schema_1.application_form_fields).values(config.customFields.map((f, i) => ({
                formId,
                section: f.section,
                label: f.label,
                fieldType: f.fieldType,
                required: f.required ?? true,
                isVisible: f.isVisible ?? true,
                isEditable: f.isEditable ?? true,
                order: f.order ?? i + 1,
            })));
        }
        if (config.customQuestions?.length) {
            await this.db.insert(application_form_questions_schema_1.application_form_questions).values(config.customQuestions.map((q, i) => ({
                companyId: user.companyId,
                formId,
                question: q.question,
                type: q.type,
                required: q.required ?? true,
                order: q.order ?? i + 1,
            })));
        }
        return { formId };
    }
    async getFormPreview(jobId) {
        const [config] = await this.db
            .select()
            .from(application_form_configs_schema_1.application_form_configs)
            .where((0, drizzle_orm_1.eq)(application_form_configs_schema_1.application_form_configs.jobId, jobId));
        if (!config) {
            throw new common_1.NotFoundException('Application form not configured for this job');
        }
        const fields = await this.db
            .select()
            .from(application_form_fields_schema_1.application_form_fields)
            .where((0, drizzle_orm_1.eq)(application_form_fields_schema_1.application_form_fields.formId, config.id))
            .orderBy((0, drizzle_orm_1.asc)(application_form_fields_schema_1.application_form_fields.order));
        const questions = await this.db
            .select()
            .from(application_form_questions_schema_1.application_form_questions)
            .where((0, drizzle_orm_1.eq)(application_form_questions_schema_1.application_form_questions.formId, config.id))
            .orderBy((0, drizzle_orm_1.asc)(application_form_questions_schema_1.application_form_questions.order));
        return {
            style: config.style,
            includeReferences: config.includeReferences,
            fields,
            questions,
        };
    }
};
exports.ApplicationFormService = ApplicationFormService;
exports.ApplicationFormService = ApplicationFormService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ApplicationFormService);
const defaultFields = [
    {
        section: 'personal',
        label: 'Full Name',
        fieldType: 'text',
        required: true,
        isVisible: true,
        isEditable: false,
    },
    {
        section: 'personal',
        label: 'Middle Name',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'personal',
        label: 'Gender',
        fieldType: 'select',
        required: false,
    },
    {
        section: 'personal',
        label: 'Phone Number',
        fieldType: 'text',
        required: true,
    },
    {
        section: 'personal',
        label: 'Email Address',
        fieldType: 'text',
        required: true,
        isVisible: true,
        isEditable: false,
    },
    {
        section: 'documents',
        label: 'Resume/CV',
        fieldType: 'file',
        required: true,
    },
    {
        section: 'documents',
        label: 'Cover Letter',
        fieldType: 'file',
        required: false,
    },
    {
        section: 'education',
        label: 'Institution Name',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'education',
        label: 'Course of Study',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'education',
        label: 'Qualification',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'education',
        label: 'Year of Graduation',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'experience',
        label: 'Company Name',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'experience',
        label: 'Job Title',
        fieldType: 'text',
        required: false,
    },
    {
        section: 'experience',
        label: 'Job Description',
        fieldType: 'textarea',
        required: false,
    },
    {
        section: 'experience',
        label: 'Start Date',
        fieldType: 'date',
        required: false,
    },
    {
        section: 'experience',
        label: 'End Date',
        fieldType: 'date',
        required: false,
    },
    {
        section: 'custom',
        label: 'Skills',
        fieldType: 'text',
        required: false,
    },
];
//# sourceMappingURL=applicationForm.service.js.map