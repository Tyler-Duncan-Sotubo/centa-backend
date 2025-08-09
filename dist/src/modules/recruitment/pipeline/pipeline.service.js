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
var PipelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const pipeline_templates_schema_1 = require("./schema/pipeline-templates.schema");
const schema_1 = require("../schema");
const pg_core_1 = require("drizzle-orm/pg-core");
const audit_service_1 = require("../../audit/audit.service");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let PipelineService = PipelineService_1 = class PipelineService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(PipelineService_1.name);
    }
    tmplListKey(companyId) {
        return `pipeline:${companyId}:templates:list`;
    }
    tmplDetailKey(templateId) {
        return `pipeline:template:${templateId}:detail+stages`;
    }
    jobStagesKey(jobId) {
        return `pipeline:job:${jobId}:stages`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.tmplListKey(opts.companyId)));
        if (opts.templateId)
            jobs.push(this.cache.del(this.tmplDetailKey(opts.templateId)));
        if (opts.jobId)
            jobs.push(this.cache.del(this.jobStagesKey(opts.jobId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:pipeline');
    }
    async createTemplate(user, dto) {
        const { companyId, id } = user;
        const { name, description, stages } = dto;
        this.logger.info({ companyId, name }, 'pipeline:tmpl:create:start');
        const existing = await this.db
            .select({ id: pipeline_templates_schema_1.pipeline_templates.id })
            .from(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.name, name), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId, name }, 'pipeline:tmpl:create:duplicate');
            throw new common_1.BadRequestException('Template name already exists for this company');
        }
        const [template] = await this.db
            .insert(pipeline_templates_schema_1.pipeline_templates)
            .values({ name, description, companyId, createdAt: new Date() })
            .returning()
            .execute();
        if (!template) {
            this.logger.error({ companyId, name }, 'pipeline:tmpl:create:failed');
            throw new common_1.BadRequestException('Failed to create template');
        }
        await this.db
            .insert(pipeline_templates_schema_1.pipeline_template_stages)
            .values((stages ?? []).map((stage, i) => ({
            templateId: template.id,
            name: stage,
            order: i + 1,
            createdAt: new Date(),
        })))
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'pipeline_template',
            entityId: template.id,
            userId: id,
            changes: {
                name: template.name,
                description: template.description,
                stages: stages?.length ?? 0,
            },
        });
        await this.burst({ companyId, templateId: template.id });
        this.logger.info({ id: template.id }, 'pipeline:tmpl:create:done');
        return template;
    }
    async findAllTemplates(companyId) {
        const key = this.tmplListKey(companyId);
        this.logger.debug({ key, companyId }, 'pipeline:tmpl:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const pts = (0, pg_core_1.alias)(pipeline_templates_schema_1.pipeline_template_stages, 'pts');
            const rows = await this.db
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
                .orderBy((0, drizzle_orm_1.asc)(pipeline_templates_schema_1.pipeline_templates.createdAt))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'pipeline:tmpl:list:db:done');
            return rows;
        });
    }
    async findTemplateWithStages(templateId) {
        const key = this.tmplDetailKey(templateId);
        this.logger.debug({ key, templateId }, 'pipeline:tmpl:detail:cache:get');
        const payload = await this.cache.getOrSetCache(key, async () => {
            const templateRows = await this.db
                .select()
                .from(pipeline_templates_schema_1.pipeline_templates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId)))
                .execute();
            if (templateRows.length === 0)
                return null;
            const stages = await this.db
                .select({
                id: pipeline_templates_schema_1.pipeline_template_stages.id,
                name: pipeline_templates_schema_1.pipeline_template_stages.name,
                order: pipeline_templates_schema_1.pipeline_template_stages.order,
                createdAt: pipeline_templates_schema_1.pipeline_template_stages.createdAt,
            })
                .from(pipeline_templates_schema_1.pipeline_template_stages)
                .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, templateId))
                .orderBy((0, drizzle_orm_1.asc)(pipeline_templates_schema_1.pipeline_template_stages.order))
                .execute();
            return { ...templateRows[0], stages };
        });
        if (!payload) {
            this.logger.warn({ templateId }, 'pipeline:tmpl:detail:not-found');
            throw new common_1.NotFoundException('Template not found');
        }
        return payload;
    }
    async updateTemplate(templateId, user, dto) {
        const { companyId, id } = user;
        const { name, description, stages } = dto;
        this.logger.info({ companyId, templateId }, 'pipeline:tmpl:update:start');
        const res = await this.db
            .update(pipeline_templates_schema_1.pipeline_templates)
            .set({ name, description })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)))
            .returning({ id: pipeline_templates_schema_1.pipeline_templates.id })
            .execute();
        if (res.length === 0) {
            this.logger.warn({ companyId, templateId }, 'pipeline:tmpl:update:not-found');
            throw new common_1.NotFoundException('Template not found or not owned by company');
        }
        await this.db
            .delete(pipeline_templates_schema_1.pipeline_template_stages)
            .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, templateId))
            .execute();
        await this.db
            .insert(pipeline_templates_schema_1.pipeline_template_stages)
            .values((stages ?? []).map((stage, i) => ({
            templateId,
            name: stage,
            order: i + 1,
            createdAt: new Date(),
        })))
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'pipeline_template',
            entityId: templateId,
            userId: id,
            changes: { name, description, stages: stages?.length ?? 0 },
        });
        await this.burst({ companyId, templateId });
        this.logger.info({ id: templateId }, 'pipeline:tmpl:update:done');
        return { message: 'Template updated' };
    }
    async deleteTemplate(templateId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, templateId }, 'pipeline:tmpl:delete:start');
        await this.db
            .delete(pipeline_templates_schema_1.pipeline_template_stages)
            .where((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_template_stages.templateId, templateId))
            .execute();
        const res = await this.db
            .delete(pipeline_templates_schema_1.pipeline_templates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.id, templateId), (0, drizzle_orm_1.eq)(pipeline_templates_schema_1.pipeline_templates.companyId, companyId)))
            .returning({ id: pipeline_templates_schema_1.pipeline_templates.id })
            .execute();
        if (res.length === 0) {
            this.logger.warn({ companyId, templateId }, 'pipeline:tmpl:delete:not-found');
            throw new common_1.NotFoundException('Template not found or not owned by company');
        }
        await this.auditService.logAction({
            action: 'delete',
            entity: 'pipeline_template',
            entityId: templateId,
            userId: id,
            changes: { message: 'Template deleted' },
        });
        await this.burst({ companyId, templateId });
        this.logger.info({ id: templateId }, 'pipeline:tmpl:delete:done');
        return { message: 'Template deleted' };
    }
    async getJobPipeline(jobId) {
        const key = this.jobStagesKey(jobId);
        this.logger.debug({ key, jobId }, 'pipeline:job:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const stages = await this.db
                .select()
                .from(schema_1.pipeline_stages)
                .where((0, drizzle_orm_1.eq)(schema_1.pipeline_stages.jobId, jobId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.pipeline_stages.order))
                .execute();
            this.logger.debug({ jobId, count: stages.length }, 'pipeline:job:list:db:done');
            return stages;
        });
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
            .returning()
            .execute();
        await this.burst({ jobId });
        this.logger.info({ jobId, stageId: inserted.id }, 'pipeline:job:add-stage:done');
        return inserted;
    }
    async reorderJobPipeline(jobId, stageIds) {
        this.logger.info({ jobId, count: stageIds?.length ?? 0 }, 'pipeline:job:reorder:start');
        const updates = stageIds.map((id, i) => this.db
            .update(schema_1.pipeline_stages)
            .set({ order: i + 1 })
            .where((0, drizzle_orm_1.eq)(schema_1.pipeline_stages.id, id))
            .execute());
        await Promise.all(updates);
        await this.burst({ jobId });
        this.logger.info({ jobId }, 'pipeline:job:reorder:done');
        return { message: 'Stages reordered' };
    }
};
exports.PipelineService = PipelineService;
exports.PipelineService = PipelineService = PipelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], PipelineService);
//# sourceMappingURL=pipeline.service.js.map