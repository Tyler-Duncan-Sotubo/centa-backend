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
exports.PipelineSeederService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const pipeline_templates_schema_1 = require("./schema/pipeline-templates.schema");
const pipeline_stages_schema_1 = require("./schema/pipeline-stages.schema");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
let PipelineSeederService = class PipelineSeederService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async seedEngineeringPipeline() {
        await this.seedTemplate({
            name: 'Engineering',
            description: 'Tech-focused hiring workflow.',
            stages: [
                'Applied',
                'Phone Screen',
                'Coding Exercise',
                'Tech Interview',
                'Onsite Interview',
                'Offer',
            ],
        });
    }
    async seedSalesPipeline() {
        await this.seedTemplate({
            name: 'Sales',
            description: 'Sales-focused hiring pipeline.',
            stages: [
                'Applied',
                'Initial Call',
                'Manager Interview',
                'Role Play / Demo',
                'Offer',
            ],
        });
    }
    async seedDefaultPipeline() {
        await this.seedTemplate({
            name: 'Default',
            description: 'Basic pipeline for general roles.',
            stages: ['Applied', 'Screening', 'Interview', 'Offer'],
        });
    }
    async seedAllTemplates() {
        await Promise.all([
            this.seedDefaultPipeline(),
            this.seedEngineeringPipeline(),
            this.seedSalesPipeline(),
        ]);
    }
    async seedTemplate({ name, description, stages, }) {
        const existing = await this.db.query.pipeline_templates.findFirst({
            where: (tpl, { eq }) => eq(tpl.name, name),
        });
        if (existing)
            return;
        const [template] = await this.db
            .insert(pipeline_templates_schema_1.pipeline_templates)
            .values({ name, description, createdAt: new Date(), isGlobal: true })
            .returning();
        if (!template)
            throw new common_1.BadRequestException(`Failed to insert template: ${name}`);
        await this.db.insert(pipeline_templates_schema_1.pipeline_template_stages).values(stages.map((stage, i) => ({
            templateId: template.id,
            name: stage,
            order: i + 1,
            createdAt: new Date(),
        })));
    }
    async cloneTemplateForCompany(templateId, user, templateName) {
        const { companyId, id } = user;
        const [originalTemplate] = await this.db
            .select()
            .from(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId), (0, drizzle_orm_1.isNull)(pipeline_templates_schema_1.pipeline_templates.companyId)));
        if (!originalTemplate) {
            throw new common_1.BadRequestException(`Global pipeline template not found`);
        }
        const resolvedName = templateName || `${originalTemplate.name} (Cloned)`;
        const existing = await this.db
            .select()
            .from(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.name, resolvedName), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)));
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Template "${resolvedName}" already exists for this company.`);
        }
        const [clonedTemplate] = await this.db
            .insert(pipeline_templates_schema_1.pipeline_templates)
            .values({
            name: resolvedName,
            description: originalTemplate.description,
            companyId,
            createdAt: new Date(),
        })
            .returning();
        if (!clonedTemplate) {
            throw new common_1.BadRequestException('Failed to clone pipeline template');
        }
        const originalStages = await this.db
            .select()
            .from(pipeline_templates_schema_1.pipeline_template_stages)
            .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, originalTemplate.id));
        if (originalStages.length) {
            await this.db.insert(pipeline_templates_schema_1.pipeline_template_stages).values(originalStages.map((stage) => ({
                templateId: clonedTemplate.id,
                name: stage.name,
                order: stage.order,
                createdAt: new Date(),
            })));
        }
        await this.auditService.logAction({
            action: 'clone',
            entity: 'pipeline_template',
            entityId: clonedTemplate.id,
            userId: id,
            changes: {
                name: clonedTemplate.name,
                description: clonedTemplate.description,
                stages: originalStages.length,
            },
        });
        return clonedTemplate;
    }
    async cloneTemplateToJob(templateId, jobId) {
        const template = await this.db.query.pipeline_templates.findFirst({
            where: (tpl, { eq }) => eq(tpl.id, templateId),
        });
        if (!template) {
            throw new common_1.BadRequestException(`Template not found`);
        }
        const stages = await this.db.query.pipeline_template_stages.findMany({
            where: (s, { eq }) => eq(s.templateId, templateId),
            orderBy: (s, { asc }) => asc(s.order),
        });
        const now = new Date();
        const stagePayloads = stages.map((stage) => ({
            jobId,
            name: stage.name,
            order: stage.order,
            createdAt: now,
        }));
        stagePayloads.push({
            jobId,
            name: 'Rejected',
            order: stages.length + 1,
            createdAt: now,
        });
        const result = await this.db.insert(pipeline_stages_schema_1.pipeline_stages).values(stagePayloads);
        return {
            message: 'Pipeline cloned successfully (including Rejected stage)',
            stageCount: result.length,
        };
    }
};
exports.PipelineSeederService = PipelineSeederService;
exports.PipelineSeederService = PipelineSeederService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PipelineSeederService);
//# sourceMappingURL=pipeline-seeder.service.js.map