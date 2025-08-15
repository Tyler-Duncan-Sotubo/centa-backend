import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, asc, count, eq, isNull, or } from 'drizzle-orm';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import {
  pipeline_template_stages,
  pipeline_templates,
} from './schema/pipeline-templates.schema';
import { pipeline_stages } from '../schema';
import { alias } from 'drizzle-orm/pg-core';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PipelineService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}
  private tags(companyId: string | 'global') {
    return [
      `company:${companyId}:pipeline-templates`,
      `company:${companyId}:pipeline-templates:stages`,
    ];
  }

  // Create a new pipeline template for a company
  async createTemplate(user: User, dto: CreatePipelineDto) {
    const { companyId, id } = user;
    const { name, description, stages } = dto;

    const existing = await this.db
      .select()
      .from(pipeline_templates)
      .where(
        and(
          eq(pipeline_templates.name, name),
          eq(pipeline_templates.companyId, companyId),
        ),
      );

    if (existing.length > 0) {
      throw new BadRequestException(
        'Template name already exists for this company',
      );
    }

    const [template] = await this.db
      .insert(pipeline_templates)
      .values({
        name,
        description,
        companyId,
        createdAt: new Date(),
      })
      .returning();

    if (!template) throw new BadRequestException('Failed to create template');

    await this.db.insert(pipeline_template_stages).values(
      stages.map((stage: string, i: number) => ({
        templateId: template.id,
        name: stage,
        order: i + 1,
        createdAt: new Date(),
      })),
    );

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

    // Invalidate company-scoped pipeline caches
    await this.cache.bumpCompanyVersion(companyId);

    return template;
  }

  // Retrieve all pipeline templates for a specific company (cached)
  async findAllTemplates(companyId: string) {
    const pts = alias(pipeline_template_stages, 'pts');

    return this.cache.getOrSetVersioned(
      companyId,
      ['pipeline', 'templates', 'all'],
      async () => {
        return this.db
          .select({
            id: pipeline_templates.id,
            name: pipeline_templates.name,
            description: pipeline_templates.description,
            isGlobal: pipeline_templates.isGlobal,
            createdAt: pipeline_templates.createdAt,
            stageCount: count(pts.id).as('stageCount'),
          })
          .from(pipeline_templates)
          .leftJoin(pts, eq(pipeline_templates.id, pts.templateId))
          .where(
            or(
              eq(pipeline_templates.companyId, companyId),
              isNull(pipeline_templates.companyId),
            ),
          )
          .groupBy(pipeline_templates.id)
          .orderBy(asc(pipeline_templates.createdAt));
      },
      { tags: this.tags(companyId) },
    );
  }

  // Retrieve a single template + its stages (cached under its owning company or "global")
  async findTemplateWithStages(templateId: string) {
    // Load template first to discover scope
    const templateRows = await this.db
      .select()
      .from(pipeline_templates)
      .where(and(eq(pipeline_templates.id, templateId)));

    if (templateRows.length === 0)
      throw new NotFoundException('Template not found');

    const template = templateRows[0];
    const scopeCompany: string | 'global' = template.companyId ?? 'global';

    return this.cache.getOrSetVersioned(
      scopeCompany,
      ['pipeline', 'templates', 'one', templateId],
      async () => {
        const stages = await this.db
          .select({
            id: pipeline_template_stages.id,
            name: pipeline_template_stages.name,
            order: pipeline_template_stages.order,
            createdAt: pipeline_template_stages.createdAt,
          })
          .from(pipeline_template_stages)
          .where(eq(pipeline_template_stages.templateId, templateId))
          .orderBy(asc(pipeline_template_stages.order));

        return { ...template, stages };
      },
      { tags: this.tags(scopeCompany) },
    );
  }

  // Update a template + stages
  async updateTemplate(templateId: string, user: User, dto: UpdatePipelineDto) {
    const { companyId, id } = user;
    const { name, description, stages } = dto;

    await this.db
      .update(pipeline_templates)
      .set({ name, description })
      .where(
        and(
          eq(pipeline_templates.id, templateId),
          eq(pipeline_templates.companyId, companyId),
        ),
      );

    await this.db
      .delete(pipeline_template_stages)
      .where(eq(pipeline_template_stages.templateId, templateId));

    await this.db.insert(pipeline_template_stages).values(
      (stages ?? []).map((stage, i) => ({
        templateId,
        name: stage,
        order: i + 1,
        createdAt: new Date(),
      })),
    );

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

    // Invalidate company-scoped pipeline caches
    await this.cache.bumpCompanyVersion(companyId);

    return { message: 'Template updated' };
  }

  // Delete a template and its stages
  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;

    await this.db
      .delete(pipeline_template_stages)
      .where(eq(pipeline_template_stages.templateId, templateId));

    await this.db
      .delete(pipeline_templates)
      .where(
        and(
          eq(pipeline_templates.id, templateId),
          eq(pipeline_templates.companyId, companyId),
        ),
      );

    await this.auditService.logAction({
      action: 'delete',
      entity: 'pipeline_template',
      entityId: templateId,
      userId: id,
      changes: { message: 'Template deleted' },
    });

    // Invalidate company-scoped pipeline caches
    await this.cache.bumpCompanyVersion(companyId);

    return { message: 'Template deleted' };
  }

  // ---------------- Job pipeline (left uncached unless companyId is available) ---------------
  async getJobPipeline(jobId: string) {
    const stages = await this.db
      .select()
      .from(pipeline_stages)
      .where(eq(pipeline_stages.jobId, jobId))
      .orderBy(asc(pipeline_stages.order));
    return stages;
  }

  async addStageToJob(jobId: string, stageName: string, order?: number) {
    const stages = await this.getJobPipeline(jobId);
    const position = order ?? stages.length + 1;

    const [inserted] = await this.db
      .insert(pipeline_stages)
      .values({
        jobId,
        name: stageName,
        order: position,
        createdAt: new Date(),
      })
      .returning();

    // If you can resolve companyId for the job, call bumpCompanyVersion(companyId) here.
    return inserted;
  }

  async reorderJobPipeline(jobId: string, stageIds: string[]) {
    const updates = stageIds.map((id, i) =>
      this.db
        .update(pipeline_stages)
        .set({ order: i + 1 })
        .where(eq(pipeline_stages.id, id)),
    );
    await Promise.all(updates);
    // If you can resolve companyId for the job, call bumpCompanyVersion(companyId) here.
    return { message: 'Stages reordered' };
  }
}
