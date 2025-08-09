import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, or, isNull, sql, asc } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  interviewInterviewers,
  scorecard_criteria,
  scorecard_templates,
} from '../schema';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ScorecardTemplateService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(ScorecardTemplateService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `scorecard:${companyId}:templates:list`; // includes system + company
  }
  private detailKey(templateId: string) {
    return `scorecard:template:${templateId}:detail+criteria`;
  }
  private async burst(opts: { companyId?: string; templateId?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.listKey(opts.companyId)));
    if (opts.templateId)
      jobs.push(this.cache.del(this.detailKey(opts.templateId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:scorecard');
  }

  // ---------- reads ----------
  async getAllTemplates(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'scorecard:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
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
          ) ORDER BY ${scorecard_criteria.order})`.as('criteria'),
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
        .orderBy(asc(scorecard_templates.createdAt))
        .execute();

      this.logger.debug(
        { companyId, count: rows.length },
        'scorecard:list:db:done',
      );
      return rows;
    });
  }

  async getTemplateWithCriteria(templateId: string, companyId?: string) {
    const key = this.detailKey(templateId);
    this.logger.debug({ key, templateId }, 'scorecard:detail:cache:get');

    const payload = await this.cache.getOrSetCache(key, async () => {
      const [tmpl] = await this.db
        .select()
        .from(scorecard_templates)
        .where(
          companyId
            ? and(
                eq(scorecard_templates.id, templateId),
                or(
                  isNull(scorecard_templates.companyId),
                  eq(scorecard_templates.companyId, companyId),
                ),
              )
            : eq(scorecard_templates.id, templateId),
        )
        .execute();

      if (!tmpl) return null;

      const criteria = await this.db
        .select({
          id: scorecard_criteria.id,
          label: scorecard_criteria.label,
          description: scorecard_criteria.description,
          maxScore: scorecard_criteria.maxScore,
          order: scorecard_criteria.order,
        })
        .from(scorecard_criteria)
        .where(eq(scorecard_criteria.templateId, templateId))
        .orderBy(asc(scorecard_criteria.order))
        .execute();

      return { ...tmpl, criteria };
    });

    if (!payload) {
      this.logger.warn({ templateId }, 'scorecard:detail:not-found');
      throw new NotFoundException('Template not found');
    }

    return payload;
  }

  // ---------- mutations ----------
  async create(user: User, dto: CreateScorecardTemplateDto) {
    const { companyId, id } = user;
    this.logger.info({ companyId, name: dto?.name }, 'scorecard:create:start');

    const [template] = await this.db
      .insert(scorecard_templates)
      .values({
        name: dto.name,
        description: dto.description,
        companyId,
        isSystem: false,
      })
      .returning()
      .execute();

    const criteria = (dto.criteria ?? []).map((c, index) => ({
      templateId: template.id,
      label: c.label,
      description: c.description,
      maxScore: c.maxScore,
      order: index + 1,
    }));

    if (criteria.length) {
      await this.db.insert(scorecard_criteria).values(criteria).execute();
    }

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

    await this.burst({ companyId, templateId: template.id });
    this.logger.info({ id: template.id }, 'scorecard:create:done');
    return template;
  }

  async cloneTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'scorecard:clone:start');

    const cloned = await this.db.transaction(async (trx) => {
      // 1) Load source system template
      const [template] = await trx
        .select()
        .from(scorecard_templates)
        .where(
          and(
            eq(scorecard_templates.id, templateId),
            isNull(scorecard_templates.companyId),
          ),
        )
        .execute();

      if (!template) {
        this.logger.warn({ templateId }, 'scorecard:clone:not-found');
        throw new NotFoundException('System template not found');
      }

      const targetName = `${template.name} (Copy)`;

      // 2) Prevent multiple clones for the same company (same targetName)
      const [dup] = await trx
        .select({ id: scorecard_templates.id })
        .from(scorecard_templates)
        .where(
          and(
            eq(scorecard_templates.companyId, companyId),
            eq(scorecard_templates.name, targetName),
          ),
        )
        .limit(1)
        .execute();

      if (dup) {
        this.logger.warn(
          { companyId, templateId, name: targetName },
          'scorecard:clone:duplicate',
        );
        throw new BadRequestException(
          'This template has already been cloned for your company.',
        );
      }

      // 3) Fetch criteria from source
      const criteria = await trx
        .select({
          label: scorecard_criteria.label,
          description: scorecard_criteria.description,
          maxScore: scorecard_criteria.maxScore,
          order: scorecard_criteria.order,
        })
        .from(scorecard_criteria)
        .where(eq(scorecard_criteria.templateId, templateId))
        .orderBy(scorecard_criteria.order)
        .execute();

      // 4) Create cloned template
      const [newTpl] = await trx
        .insert(scorecard_templates)
        .values({
          name: targetName,
          description: template.description,
          companyId,
          isSystem: false,
        })
        .returning()
        .execute();

      // 5) Clone criteria
      if (criteria.length) {
        await trx
          .insert(scorecard_criteria)
          .values(
            criteria.map((c) => ({
              templateId: newTpl.id,
              label: c.label,
              description: c.description,
              maxScore: c.maxScore,
              order: c.order,
            })),
          )
          .execute();
      }

      // 6) Audit
      await this.auditService.logAction({
        action: 'clone',
        entity: 'scorecard_template',
        entityId: newTpl.id,
        userId: id,
        details: 'Cloned scorecard template (with criteria)',
        changes: {
          name: newTpl.name,
          description: newTpl.description,
          criteriaCloned: criteria.length,
        },
      });

      return newTpl;
    });

    await this.burst({ companyId, templateId: cloned.id });
    this.logger.info({ id: cloned.id }, 'scorecard:clone:done');
    return cloned;
  }

  async seedSystemTemplates() {
    this.logger.info({}, 'scorecard:seed:start');

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
        .returning()
        .execute();

      const criteria = tmpl.criteria.map((c, index) => ({
        templateId: template.id,
        label: c.label,
        description: c.description,
        maxScore: 5,
        order: index + 1,
      }));

      await this.db.insert(scorecard_criteria).values(criteria).execute();
    }

    await this.burst({});
    this.logger.info({}, 'scorecard:seed:done');
    return { success: true };
  }

  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'scorecard:delete:start');

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
      this.logger.warn({ templateId }, 'scorecard:delete:not-found');
      throw new NotFoundException(`Template not found`);
    }

    if (template.isSystem) {
      this.logger.warn({ templateId }, 'scorecard:delete:is-system');
      throw new BadRequestException(`System templates cannot be deleted`);
    }

    const isInUse = await this.db.query.interviewInterviewers.findFirst({
      where: eq(interviewInterviewers.scorecardTemplateId, templateId),
    });
    if (isInUse) {
      this.logger.warn({ templateId }, 'scorecard:delete:in-use');
      throw new BadRequestException(
        `Cannot delete: This template is in use by one or more interviews`,
      );
    }

    await this.db
      .delete(scorecard_templates)
      .where(eq(scorecard_templates.id, templateId))
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'scorecard_template',
      entityId: templateId,
      userId: id,
      details: 'Deleted scorecard template',
      changes: { name: template.name, description: template.description },
    });

    await this.burst({ companyId, templateId });
    this.logger.info({ templateId }, 'scorecard:delete:done');
    return { message: 'Template deleted successfully' };
  }
}
