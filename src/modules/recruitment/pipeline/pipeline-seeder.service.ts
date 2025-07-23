import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  pipeline_template_stages,
  pipeline_templates,
} from './schema/pipeline-templates.schema';
import { pipeline_stages } from './schema/pipeline-stages.schema';
import { eq, and, isNull } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';

@Injectable()
export class PipelineSeederService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

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

  private async seedTemplate({
    name,
    description,
    stages,
  }: {
    name: string;
    description: string;
    stages: string[];
  }) {
    const existing = await this.db.query.pipeline_templates.findFirst({
      where: (tpl, { eq }) => eq(tpl.name, name),
    });

    if (existing) return;

    const [template] = await this.db
      .insert(pipeline_templates)
      .values({ name, description, createdAt: new Date(), isGlobal: true })
      .returning();

    if (!template)
      throw new BadRequestException(`Failed to insert template: ${name}`);

    await this.db.insert(pipeline_template_stages).values(
      stages.map((stage, i) => ({
        templateId: template.id,
        name: stage,
        order: i + 1,
        createdAt: new Date(),
      })),
    );
  }

  async cloneTemplateForCompany(
    templateId: string,
    user: User,
    templateName?: string,
  ) {
    const { companyId, id } = user;
    // Step 1: Fetch the original (global or shared) template
    const [originalTemplate] = await this.db
      .select()
      .from(pipeline_templates)
      .where(
        and(
          eq(pipeline_templates.id, templateId),
          isNull(pipeline_templates.companyId), // must be global
        ),
      );

    if (!originalTemplate) {
      throw new BadRequestException(`Global pipeline template not found`);
    }

    const resolvedName = templateName || `${originalTemplate.name} (Cloned)`;

    // Step 2: Prevent duplicates for this company
    const existing = await this.db
      .select()
      .from(pipeline_templates)
      .where(
        and(
          eq(pipeline_templates.name, resolvedName),
          eq(pipeline_templates.companyId, companyId),
        ),
      );

    if (existing.length > 0) {
      throw new BadRequestException(
        `Template "${resolvedName}" already exists for this company.`,
      );
    }

    // Step 3: Create the new company-specific template
    const [clonedTemplate] = await this.db
      .insert(pipeline_templates)
      .values({
        name: resolvedName,
        description: originalTemplate.description,
        companyId,
        createdAt: new Date(),
      })
      .returning();

    if (!clonedTemplate) {
      throw new BadRequestException('Failed to clone pipeline template');
    }

    // Step 4: Copy all stages into the new template
    const originalStages = await this.db
      .select()
      .from(pipeline_template_stages)
      .where(eq(pipeline_template_stages.templateId, originalTemplate.id));

    if (originalStages.length) {
      await this.db.insert(pipeline_template_stages).values(
        originalStages.map((stage) => ({
          templateId: clonedTemplate.id,
          name: stage.name,
          order: stage.order,
          createdAt: new Date(),
        })),
      );
    }

    // Step 5: Log the cloning action
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

  async cloneTemplateToJob(templateId: string, jobId: string) {
    const template = await this.db.query.pipeline_templates.findFirst({
      where: (tpl, { eq }) => eq(tpl.id, templateId),
    });

    if (!template) {
      throw new BadRequestException(`Template not found`);
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

    // Add "Rejected" stage as last stage
    stagePayloads.push({
      jobId,
      name: 'Rejected',
      order: stages.length + 1,
      createdAt: now,
    });

    const result = await this.db.insert(pipeline_stages).values(stagePayloads);

    return {
      message: 'Pipeline cloned successfully (including Rejected stage)',
      stageCount: result.length,
    };
  }
}
