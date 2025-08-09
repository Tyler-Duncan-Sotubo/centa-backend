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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PipelineService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(PipelineService.name);
  }

  // ---------- cache keys ----------
  private tmplListKey(companyId: string) {
    return `pipeline:${companyId}:templates:list`;
  }
  private tmplDetailKey(templateId: string) {
    return `pipeline:template:${templateId}:detail+stages`;
  }
  private jobStagesKey(jobId: string) {
    return `pipeline:job:${jobId}:stages`;
  }
  private async burst(opts: {
    companyId?: string;
    templateId?: string;
    jobId?: string;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId)
      jobs.push(this.cache.del(this.tmplListKey(opts.companyId)));
    if (opts.templateId)
      jobs.push(this.cache.del(this.tmplDetailKey(opts.templateId)));
    if (opts.jobId) jobs.push(this.cache.del(this.jobStagesKey(opts.jobId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:pipeline');
  }

  // ---------- templates ----------
  async createTemplate(user: User, dto: CreatePipelineDto) {
    const { companyId, id } = user;
    const { name, description, stages } = dto;
    this.logger.info({ companyId, name }, 'pipeline:tmpl:create:start');

    const existing = await this.db
      .select({ id: pipeline_templates.id })
      .from(pipeline_templates)
      .where(
        and(
          eq(pipeline_templates.name, name),
          eq(pipeline_templates.companyId, companyId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      this.logger.warn({ companyId, name }, 'pipeline:tmpl:create:duplicate');
      throw new BadRequestException(
        'Template name already exists for this company',
      );
    }

    const [template] = await this.db
      .insert(pipeline_templates)
      .values({ name, description, companyId, createdAt: new Date() })
      .returning()
      .execute();

    if (!template) {
      this.logger.error({ companyId, name }, 'pipeline:tmpl:create:failed');
      throw new BadRequestException('Failed to create template');
    }

    await this.db
      .insert(pipeline_template_stages)
      .values(
        (stages ?? []).map((stage: string, i: number) => ({
          templateId: template.id,
          name: stage,
          order: i + 1,
          createdAt: new Date(),
        })),
      )
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

  async findAllTemplates(companyId: string) {
    const key = this.tmplListKey(companyId);
    this.logger.debug({ key, companyId }, 'pipeline:tmpl:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const pts = alias(pipeline_template_stages, 'pts');
      const rows = await this.db
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
        .orderBy(asc(pipeline_templates.createdAt))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'pipeline:tmpl:list:db:done',
      );
      return rows;
    });
  }

  async findTemplateWithStages(templateId: string) {
    const key = this.tmplDetailKey(templateId);
    this.logger.debug({ key, templateId }, 'pipeline:tmpl:detail:cache:get');

    const payload = await this.cache.getOrSetCache(key, async () => {
      const templateRows = await this.db
        .select()
        .from(pipeline_templates)
        .where(and(eq(pipeline_templates.id, templateId)))
        .execute();

      if (templateRows.length === 0) return null;

      const stages = await this.db
        .select({
          id: pipeline_template_stages.id,
          name: pipeline_template_stages.name,
          order: pipeline_template_stages.order,
          createdAt: pipeline_template_stages.createdAt,
        })
        .from(pipeline_template_stages)
        .where(eq(pipeline_template_stages.templateId, templateId))
        .orderBy(asc(pipeline_template_stages.order))
        .execute();

      return { ...templateRows[0], stages };
    });

    if (!payload) {
      this.logger.warn({ templateId }, 'pipeline:tmpl:detail:not-found');
      throw new NotFoundException('Template not found');
    }

    return payload;
  }

  async updateTemplate(templateId: string, user: User, dto: UpdatePipelineDto) {
    const { companyId, id } = user;
    const { name, description, stages } = dto;
    this.logger.info({ companyId, templateId }, 'pipeline:tmpl:update:start');

    const res = await this.db
      .update(pipeline_templates)
      .set({ name, description })
      .where(
        and(
          eq(pipeline_templates.id, templateId),
          eq(pipeline_templates.companyId, companyId),
        ),
      )
      .returning({ id: pipeline_templates.id })
      .execute();

    if (res.length === 0) {
      this.logger.warn(
        { companyId, templateId },
        'pipeline:tmpl:update:not-found',
      );
      throw new NotFoundException('Template not found or not owned by company');
    }

    await this.db
      .delete(pipeline_template_stages)
      .where(eq(pipeline_template_stages.templateId, templateId))
      .execute();

    await this.db
      .insert(pipeline_template_stages)
      .values(
        (stages ?? []).map((stage, i) => ({
          templateId,
          name: stage,
          order: i + 1,
          createdAt: new Date(),
        })),
      )
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

  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'pipeline:tmpl:delete:start');

    await this.db
      .delete(pipeline_template_stages)
      .where(eq(pipeline_template_stages.templateId, templateId))
      .execute();

    const res = await this.db
      .delete(pipeline_templates)
      .where(
        and(
          eq(pipeline_templates.id, templateId),
          eq(pipeline_templates.companyId, companyId),
        ),
      )
      .returning({ id: pipeline_templates.id })
      .execute();

    if (res.length === 0) {
      this.logger.warn(
        { companyId, templateId },
        'pipeline:tmpl:delete:not-found',
      );
      throw new NotFoundException('Template not found or not owned by company');
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

  // ---------- job pipelines ----------
  async getJobPipeline(jobId: string) {
    const key = this.jobStagesKey(jobId);
    this.logger.debug({ key, jobId }, 'pipeline:job:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const stages = await this.db
        .select()
        .from(pipeline_stages)
        .where(eq(pipeline_stages.jobId, jobId))
        .orderBy(asc(pipeline_stages.order))
        .execute();
      this.logger.debug(
        { jobId, count: stages.length },
        'pipeline:job:list:db:done',
      );
      return stages;
    });
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
      .returning()
      .execute();

    await this.burst({ jobId });
    this.logger.info(
      { jobId, stageId: inserted.id },
      'pipeline:job:add-stage:done',
    );
    return inserted;
  }

  async reorderJobPipeline(jobId: string, stageIds: string[]) {
    this.logger.info(
      { jobId, count: stageIds?.length ?? 0 },
      'pipeline:job:reorder:start',
    );

    const updates = stageIds.map((id, i) =>
      this.db
        .update(pipeline_stages)
        .set({ order: i + 1 })
        .where(eq(pipeline_stages.id, id))
        .execute(),
    );
    await Promise.all(updates);

    await this.burst({ jobId });
    this.logger.info({ jobId }, 'pipeline:job:reorder:done');
    return { message: 'Stages reordered' };
  }
}
