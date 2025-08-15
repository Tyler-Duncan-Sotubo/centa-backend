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
exports.PipelineService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const pipeline_templates_schema_1 = require("./schema/pipeline-templates.schema");
const schema_1 = require("../schema");
const pg_core_1 = require("drizzle-orm/pg-core");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let PipelineService = class PipelineService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(companyId) {
        return [
            `company:${companyId}:pipeline-templates`,
            `company:${companyId}:pipeline-templates:stages`,
        ];
    }
    async createTemplate(user, dto) {
        const { companyId, id } = user;
        const { name, description, stages } = dto;
        const existing = await this.db
            .select()
            .from(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.name, name), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)));
        if (existing.length > 0) {
            throw new common_1.BadRequestException('Template name already exists for this company');
        }
        const [template] = await this.db
            .insert(pipeline_templates_schema_1.pipeline_templates)
            .values({
            name,
            description,
            companyId,
            createdAt: new Date(),
        })
            .returning();
        if (!template)
            throw new common_1.BadRequestException('Failed to create template');
        await this.db.insert(pipeline_templates_schema_1.pipeline_template_stages).values(stages.map((stage, i) => ({
            templateId: template.id,
            name: stage,
            order: i + 1,
            createdAt: new Date(),
        })));
        await this.auditService.logAction({
            action: 'create',
            entity: 'pipeline_template',
            entityId: template.id,
            userId: id,
            changes: {
                name: template.name,
                description: template.description,
                stages: stages.length,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return template;
    }
    async findAllTemplates(companyId) {
        const pts = (0, pg_core_1.alias)(pipeline_templates_schema_1.pipeline_template_stages, 'pts');
        return this.cache.getOrSetVersioned(companyId, ['pipeline', 'templates', 'all'], async () => {
            return this.db
                .select({
                id: pipeline_templates_schema_1.pipeline_templates.id,
                name: pipeline_templates_schema_1.pipeline_templates.name,
                description: pipeline_templates_schema_1.pipeline_templates.description,
                isGlobal: pipeline_templates_schema_1.pipeline_templates.isGlobal,
                createdAt: pipeline_templates_schema_1.pipeline_templates.createdAt,
                stageCount: (0, drizzle_orm_1.count)(pts.id).as('stageCount'),
            })
                .from(pipeline_templates_schema_1.pipeline_templates)
                .leftJoin(pts, (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, pts.templateId))
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId), (0, drizzle_orm_1.isNull)(pipeline_templates_schema_1.pipeline_templates.companyId)))
                .groupBy(pipeline_templates_schema_1.pipeline_templates.id)
                .orderBy((0, drizzle_orm_1.asc)(pipeline_templates_schema_1.pipeline_templates.createdAt));
        }, { tags: this.tags(companyId) });
    }
    async findTemplateWithStages(templateId) {
        const templateRows = await this.db
            .select()
            .from(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId)));
        if (templateRows.length === 0)
            throw new common_1.NotFoundException('Template not found');
        const template = templateRows[0];
        const scopeCompany = template.companyId ?? 'global';
        return this.cache.getOrSetVersioned(scopeCompany, ['pipeline', 'templates', 'one', templateId], async () => {
            const stages = await this.db
                .select({
                id: pipeline_templates_schema_1.pipeline_template_stages.id,
                name: pipeline_templates_schema_1.pipeline_template_stages.name,
                order: pipeline_templates_schema_1.pipeline_template_stages.order,
                createdAt: pipeline_templates_schema_1.pipeline_template_stages.createdAt,
            })
                .from(pipeline_templates_schema_1.pipeline_template_stages)
                .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, templateId))
                .orderBy((0, drizzle_orm_1.asc)(pipeline_templates_schema_1.pipeline_template_stages.order));
            return { ...template, stages };
        }, { tags: this.tags(scopeCompany) });
    }
    async updateTemplate(templateId, user, dto) {
        const { companyId, id } = user;
        const { name, description, stages } = dto;
        await this.db
            .update(pipeline_templates_schema_1.pipeline_templates)
            .set({ name, description })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)));
        await this.db
            .delete(pipeline_templates_schema_1.pipeline_template_stages)
            .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, templateId));
        await this.db.insert(pipeline_templates_schema_1.pipeline_template_stages).values((stages ?? []).map((stage, i) => ({
            templateId,
            name: stage,
            order: i + 1,
            createdAt: new Date(),
        })));
        await this.auditService.logAction({
            action: 'update',
            entity: 'pipeline_template',
            entityId: templateId,
            userId: id,
            changes: {
                name,
                description,
                stages: stages?.length ?? 0,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return { message: 'Template updated' };
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        await this.db
            .delete(pipeline_templates_schema_1.pipeline_template_stages)
            .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, templateId));
        await this.db
            .delete(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'pipeline_template',
            entityId: templateId,
            userId: id,
            changes: { message: 'Template deleted' },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return { message: 'Template deleted' };
    }
    async getJobPipeline(jobId) {
        const stages = await this.db
            .select()
            .from(schema_1.pipeline_stages)
            .where((0, drizzle_orm_1.eq)(schema_1.pipeline_stages.jobId, jobId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.pipeline_stages.order));
        return stages;
    }
    async addStageToJob(jobId, stageName, order) {
        const stages = await this.getJobPipeline(jobId);
        const position = order ?? stages.length + 1;
        const [inserted] = await this.db
            .insert(schema_1.pipeline_stages)
            .values({
            jobId,
            name: stageName,
            order: position,
            createdAt: new Date(),
        })
            .returning();
        return inserted;
    }
    async reorderJobPipeline(jobId, stageIds) {
        const updates = stageIds.map((id, i) => this.db
            .update(schema_1.pipeline_stages)
            .set({ order: i + 1 })
            .where((0, drizzle_orm_1.eq)(schema_1.pipeline_stages.id, id)));
        await Promise.all(updates);
        return { message: 'Stages reordered' };
    }
};
exports.PipelineService = PipelineService;
exports.PipelineService = PipelineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], PipelineService);
//# sourceMappingURL=pipeline.service.js.map