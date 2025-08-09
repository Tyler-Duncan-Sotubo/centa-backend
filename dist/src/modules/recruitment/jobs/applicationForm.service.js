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
var ApplicationFormService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationFormService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const application_form_fields_schema_1 = require("./schema/application-form-fields.schema");
const application_form_questions_schema_1 = require("./schema/application-form-questions.schema");
const application_form_configs_schema_1 = require("./schema/application-form-configs.schema");
const drizzle_orm_1 = require("drizzle-orm");
const application_field_definitions_schema_1 = require("./schema/application-field-definitions.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let ApplicationFormService = ApplicationFormService_1 = class ApplicationFormService {
    constructor(db, logger, cache) {
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(ApplicationFormService_1.name);
    }
    defaultDefsKey() {
        return `appform:defaults`;
    }
    formConfigKey(jobId) {
        return `appform:job:${jobId}:config`;
    }
    formPreviewKey(jobId) {
        return `appform:job:${jobId}:preview`;
    }
    fieldsKey(jobId) {
        return `appform:job:${jobId}:fields`;
    }
    questionsKey(jobId) {
        return `appform:job:${jobId}:questions`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.defaults)
            jobs.push(this.cache.del(this.defaultDefsKey()));
        if (opts.jobId) {
            jobs.push(this.cache.del(this.formConfigKey(opts.jobId)));
            jobs.push(this.cache.del(this.formPreviewKey(opts.jobId)));
            jobs.push(this.cache.del(this.fieldsKey(opts.jobId)));
            jobs.push(this.cache.del(this.questionsKey(opts.jobId)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:application-form');
    }
    async seedDefaultFields() {
        this.logger.info({}, 'appform:seedDefaults:start');
        const count = (await this.db.select().from(application_field_definitions_schema_1.application_field_definitions).execute()).length;
        if (count > 0) {
            this.logger.warn({ count }, 'appform:seedDefaults:already-exists');
            throw new common_1.BadRequestException('Default fields already exist');
        }
        await this.db
            .insert(application_field_definitions_schema_1.application_field_definitions)
            .values(defaultFields.map((field, index) => ({
            section: field.section,
            label: field.label,
            fieldType: field.fieldType,
            required: field.required,
            isVisible: field.isVisible ?? true,
            isEditable: field.isEditable ?? true,
            order: index + 1,
        })))
            .execute();
        await this.burst({ defaults: true });
        this.logger.info({ inserted: defaultFields.length }, 'appform:seedDefaults:done');
    }
    async getDefaultFields() {
        const key = this.defaultDefsKey();
        this.logger.debug({ key }, 'appform:getDefaults:cache:get');
        const fields = await this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(application_field_definitions_schema_1.application_field_definitions)
                .execute();
            return rows;
        });
        if (!fields || fields.length === 0) {
            this.logger.warn({}, 'appform:getDefaults:not-found');
            throw new common_1.NotFoundException('No default fields found');
        }
        return fields;
    }
    async upsertApplicationForm(jobId, user, config) {
        this.logger.info({ jobId, companyId: user.companyId, style: config?.style }, 'appform:upsert:start');
        const existing = await this.db
            .select()
            .from(application_form_configs_schema_1.application_form_configs)
            .where((0, drizzle_orm_1.eq)(application_form_configs_schema_1.application_form_configs.jobId, jobId))
            .execute();
        let formId;
        if (existing.length > 0) {
            formId = existing[0].id;
            await this.db
                .update(application_form_configs_schema_1.application_form_configs)
                .set({
                style: config.style,
                includeReferences: config.includeReferences ?? false,
            })
                .where((0, drizzle_orm_1.eq)(application_form_configs_schema_1.application_form_configs.id, formId))
                .execute();
        }
        else {
            const [form] = await this.db
                .insert(application_form_configs_schema_1.application_form_configs)
                .values({
                jobId,
                style: config.style,
                includeReferences: config.includeReferences ?? false,
            })
                .returning()
                .execute();
            formId = form.id;
            this.logger.debug({ jobId, formId }, 'appform:upsert:created');
        }
        if (config.customFields?.length) {
            await this.db
                .insert(application_form_fields_schema_1.application_form_fields)
                .values(config.customFields.map((f, i) => ({
                formId,
                section: f.section,
                label: f.label,
                fieldType: f.fieldType,
                required: f.required ?? true,
                isVisible: f.isVisible ?? true,
                isEditable: f.isEditable ?? true,
                order: f.order ?? i + 1,
            })))
                .execute();
        }
        if (config.customQuestions?.length) {
            await this.db
                .insert(application_form_questions_schema_1.application_form_questions)
                .values(config.customQuestions.map((q, i) => ({
                companyId: user.companyId,
                formId,
                question: q.question,
                type: q.type,
                required: q.required ?? true,
                order: q.order ?? i + 1,
            })))
                .execute();
        }
        await this.burst({ jobId });
        this.logger.info({ jobId, formId }, 'appform:upsert:done');
        return { formId };
    }
    async getFormPreview(jobId) {
        const key = this.formPreviewKey(jobId);
        this.logger.debug({ key, jobId }, 'appform:preview:cache:get');
        const payload = await this.cache.getOrSetCache(key, async () => {
            const [config] = await this.db
                .select()
                .from(application_form_configs_schema_1.application_form_configs)
                .where((0, drizzle_orm_1.eq)(application_form_configs_schema_1.application_form_configs.jobId, jobId))
                .execute();
            if (!config)
                return null;
            const fields = await this.db
                .select()
                .from(application_form_fields_schema_1.application_form_fields)
                .where((0, drizzle_orm_1.eq)(application_form_fields_schema_1.application_form_fields.formId, config.id))
                .orderBy((0, drizzle_orm_1.asc)(application_form_fields_schema_1.application_form_fields.order))
                .execute();
            const questions = await this.db
                .select()
                .from(application_form_questions_schema_1.application_form_questions)
                .where((0, drizzle_orm_1.eq)(application_form_questions_schema_1.application_form_questions.formId, config.id))
                .orderBy((0, drizzle_orm_1.asc)(application_form_questions_schema_1.application_form_questions.order))
                .execute();
            return {
                style: config.style,
                includeReferences: config.includeReferences,
                fields,
                questions,
            };
        });
        if (!payload) {
            this.logger.warn({ jobId }, 'appform:preview:not-configured');
            throw new common_1.NotFoundException('Application form not configured for this job');
        }
        return payload;
    }
};
exports.ApplicationFormService = ApplicationFormService;
exports.ApplicationFormService = ApplicationFormService = ApplicationFormService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
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
    { section: 'custom', label: 'Skills', fieldType: 'text', required: false },
];
//# sourceMappingURL=applicationForm.service.js.map