import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, or, isNull, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  interviewInterviewers,
  scorecard_criteria,
  scorecard_templates,
} from '../schema';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';

@Injectable()
export class ScorecardTemplateService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async getAllTemplates(companyId: string) {
    const templates = await this.db
      .select({
        id: scorecard_templates.id,
        name: scorecard_templates.name,
        description: scorecard_templates.description,
        isSystem: scorecard_templates.isSystem,
        createdAt: scorecard_templates.createdAt,
        criteria: sql`json_agg(json_build_object(
          'id', ${scorecard_criteria.id},
          'name', ${scorecard_criteria.label},
          'maxScore', ${scorecard_criteria.maxScore},
          'description', ${scorecard_criteria.description}
        ))`.as('criteria'),
      })
      .from(scorecard_templates)
      .leftJoin(
        scorecard_criteria,
        eq(scorecard_templates.id, scorecard_criteria.templateId),
      )
      .where(
        or(
          isNull(scorecard_templates.companyId),
          eq(scorecard_templates.companyId, companyId),
        ),
      )
      .groupBy(scorecard_templates.id)
      .orderBy(scorecard_templates.createdAt);

    return templates;
  }

  async create(user: User, dto: CreateScorecardTemplateDto) {
    const { companyId, id } = user;
    const [template] = await this.db
      .insert(scorecard_templates)
      .values({
        name: dto.name,
        description: dto.description,
        companyId,
        isSystem: false,
      })
      .returning();

    const criteria = dto.criteria.map((c, index) => ({
      templateId: template.id,
      label: c.label,
      description: c.description,
      maxScore: c.maxScore,
      order: index + 1,
    }));

    await this.db.insert(scorecard_criteria).values(criteria);

    await this.auditService.logAction({
      action: 'create',
      entity: 'scorecard_template',
      entityId: template.id,
      userId: id,
      details: 'Created scorecard template',
      changes: {
        name: template.name,
        description: template.description,
        criteria: criteria.map((c) => ({
          label: c.label,
          description: c.description,
          maxScore: c.maxScore,
          order: c.order,
        })),
      },
    });

    return template;
  }

  async cloneTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    const [template] = await this.db
      .select()
      .from(scorecard_templates)
      .where(
        and(
          eq(scorecard_templates.id, templateId),
          isNull(scorecard_templates.companyId),
        ),
      );

    if (!template) throw new NotFoundException('System template not found');

    const [cloned] = await this.db
      .insert(scorecard_templates)
      .values({
        name: `${template.name} (Copy)`,
        description: template.description,
        companyId,
        isSystem: false,
      })
      .returning();

    // log the creation of the cloned template
    await this.auditService.logAction({
      action: 'clone',
      entity: 'scorecard_template',
      entityId: cloned.id,
      userId: id,
      details: 'Cloned scorecard template',
      changes: {
        name: cloned.name,
        description: cloned.description,
      },
    });

    return cloned;
  }

  async seedSystemTemplates() {
    const templates = [
      {
        name: 'General Screening',
        description: 'Initial evaluation for overall candidate fit',
        criteria: [
          {
            label: 'Communication Skills',
            description: 'Verbal and written clarity',
          },
          {
            label: 'Confidence & Poise',
            description: 'Professional demeanor and composure',
          },
          {
            label: 'Motivation & Interest',
            description: 'Genuine interest in the role and company',
          },
        ],
      },
      {
        name: 'Technical Interview (Engineering)',
        description: 'Evaluate technical ability and problem-solving',
        criteria: [
          {
            label: 'Problem Solving',
            description: 'Ability to break down complex challenges',
          },
          {
            label: 'Coding Proficiency',
            description: 'Clean, efficient, and correct code',
          },
          {
            label: 'Technical Communication',
            description: 'Explains ideas and decisions well',
          },
        ],
      },
      {
        name: 'Culture Fit',
        description: 'Assess alignment with company values and culture',
        criteria: [
          {
            label: 'Team Collaboration',
            description: 'Works well with others',
          },
          {
            label: 'Adaptability',
            description: 'Adjusts to change and ambiguity',
          },
          {
            label: 'Alignment with Company Values',
            description: 'Embodies core principles',
          },
        ],
      },
      {
        name: 'Leadership Evaluation',
        description: 'For team lead or managerial roles',
        criteria: [
          {
            label: 'Decision-Making',
            description: 'Judges situations and takes ownership',
          },
          {
            label: 'Team Management',
            description: 'Leads and motivates team effectively',
          },
          {
            label: 'Strategic Thinking',
            description: 'Plans long-term and thinks big-picture',
          },
        ],
      },
      {
        name: 'Internship Screening',
        description: 'Evaluate learning potential in early-career candidates',
        criteria: [
          {
            label: 'Learning Ability',
            description: 'Quick to grasp new concepts',
          },
          {
            label: 'Enthusiasm',
            description: 'Shows energy and eagerness to learn',
          },
          {
            label: 'Basic Technical Knowledge',
            description: 'Understands core concepts',
          },
        ],
      },
    ];

    for (const tmpl of templates) {
      const [template] = await this.db
        .insert(scorecard_templates)
        .values({
          name: tmpl.name,
          description: tmpl.description,
          isSystem: true,
        })
        .returning();

      const criteria = tmpl.criteria.map((c, index) => ({
        templateId: template.id,
        label: c.label,
        description: c.description,
        maxScore: 5,
        order: index + 1,
      }));

      await this.db.insert(scorecard_criteria).values(criteria);
    }

    return { success: true };
  }

  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;

    // 1. Fetch the template
    const template = await this.db.query.scorecard_templates.findFirst({
      where: and(
        eq(scorecard_templates.id, templateId),
        or(
          isNull(scorecard_templates.companyId),
          eq(scorecard_templates.companyId, companyId),
        ),
      ),
    });

    if (!template) {
      throw new NotFoundException(`Template not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException(`System templates cannot be deleted`);
    }

    // 2. Check if any interviews are using this template
    const isInUse = await this.db.query.interviewInterviewers.findFirst({
      where: eq(interviewInterviewers.scorecardTemplateId, templateId),
    });
    if (isInUse) {
      throw new BadRequestException(
        `Cannot delete: This template is in use by one or more interviews`,
      );
    }

    // 3. Proceed with deletion
    await this.db
      .delete(scorecard_templates)
      .where(eq(scorecard_templates.id, templateId));

    // 4. Log audit
    await this.auditService.logAction({
      action: 'delete',
      entity: 'scorecard_template',
      entityId: templateId,
      userId: id,
      details: 'Deleted scorecard template',
      changes: {
        name: template.name,
        description: template.description,
      },
    });

    return { message: 'Template deleted successfully' };
  }
}
