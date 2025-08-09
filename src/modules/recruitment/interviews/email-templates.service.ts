import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, or, isNull, asc } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { interviewEmailTemplates } from './schema/interview-email-templates.schema';
import { CreateEmailTemplateDto } from './dto/email-template.dto';
import { interviews } from './schema/interviews.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class InterviewEmailTemplateService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(InterviewEmailTemplateService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `ivemail:${companyId}:templates:list`; // company + system
  }
  private detailKey(templateId: string) {
    return `ivemail:template:${templateId}:detail`;
  }
  private async burst(opts: { companyId?: string; templateId?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.listKey(opts.companyId)));
    if (opts.templateId)
      jobs.push(this.cache.del(this.detailKey(opts.templateId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:interview-email');
  }

  // ---------- reads ----------
  async getAllTemplates(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'ivemail:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(interviewEmailTemplates)
        .where(
          or(
            isNull(interviewEmailTemplates.companyId),
            eq(interviewEmailTemplates.companyId, companyId),
          ),
        )
        .groupBy(interviewEmailTemplates.id)
        .orderBy(asc(interviewEmailTemplates.createdAt))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'ivemail:list:db:done',
      );
      return rows;
    });
  }

  async getOne(templateId: string, companyId?: string) {
    const key = this.detailKey(templateId);
    this.logger.debug({ key, templateId }, 'ivemail:detail:cache:get');

    const row = await this.cache.getOrSetCache(key, async () => {
      const [tmpl] = await this.db
        .select()
        .from(interviewEmailTemplates)
        .where(
          companyId
            ? and(
                eq(interviewEmailTemplates.id, templateId),
                or(
                  isNull(interviewEmailTemplates.companyId),
                  eq(interviewEmailTemplates.companyId, companyId),
                ),
              )
            : eq(interviewEmailTemplates.id, templateId),
        )
        .execute();
      return tmpl ?? null;
    });

    if (!row) {
      this.logger.warn({ templateId }, 'ivemail:detail:not-found');
      throw new NotFoundException('Template not found');
    }
    return row;
  }

  // ---------- mutations ----------
  async create(user: User, dto: CreateEmailTemplateDto) {
    const { companyId, id } = user;
    this.logger.info({ companyId, name: dto?.name }, 'ivemail:create:start');

    const [template] = await this.db
      .insert(interviewEmailTemplates)
      .values({ ...dto, companyId: companyId, isGlobal: false, createdBy: id })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'email',
      entityId: template.id,
      userId: id,
      details: 'Created email template',
      changes: {
        name: template.name,
        subject: template.subject,
        body: template.body,
        isGlobal: template.isGlobal,
        companyId: template.companyId,
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });

    await this.burst({ companyId, templateId: template.id });
    this.logger.info({ id: template.id }, 'ivemail:create:done');
    return template;
  }

  async cloneTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'ivemail:clone:start');

    const [template] = await this.db
      .select()
      .from(interviewEmailTemplates)
      .where(
        and(
          eq(interviewEmailTemplates.id, templateId),
          isNull(interviewEmailTemplates.companyId),
        ),
      )
      .execute();

    if (!template) {
      this.logger.warn({ templateId }, 'ivemail:clone:not-found');
      throw new NotFoundException('System template not found');
    }

    const [cloned] = await this.db
      .insert(interviewEmailTemplates)
      .values({
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body: template.body,
        createdBy: id,
        companyId,
        isGlobal: false,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'clone',
      entity: 'email',
      entityId: cloned.id,
      userId: id,
      details: 'Cloned email template',
      changes: {
        name: cloned.name,
        subject: cloned.subject,
        body: cloned.body,
        isGlobal: cloned.isGlobal,
        companyId: cloned.companyId,
        createdBy: cloned.createdBy,
      },
    });

    await this.burst({ companyId, templateId: cloned.id });
    this.logger.info({ id: cloned.id }, 'ivemail:clone:done');
    return cloned;
  }

  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'ivemail:delete:start');

    const template = await this.db.query.interviewEmailTemplates.findFirst({
      where: and(
        eq(interviewEmailTemplates.id, templateId),
        or(
          isNull(interviewEmailTemplates.companyId),
          eq(interviewEmailTemplates.companyId, companyId),
        ),
      ),
    });

    if (!template) {
      this.logger.warn({ templateId }, 'ivemail:delete:not-found');
      throw new NotFoundException(`Template not found`);
    }

    if (template.isGlobal) {
      this.logger.warn({ templateId }, 'ivemail:delete:is-global');
      throw new BadRequestException(`System templates cannot be deleted`);
    }

    const inUse = await this.db.query.interviews.findFirst({
      where: eq(interviews.emailTemplateId, templateId),
    });
    if (inUse) {
      this.logger.warn({ templateId }, 'ivemail:delete:in-use');
      throw new BadRequestException(
        `Cannot delete: This template is being used in one or more interviews`,
      );
    }

    await this.db
      .delete(interviewEmailTemplates)
      .where(eq(interviewEmailTemplates.id, templateId))
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'email',
      entityId: templateId,
      userId: id,
      details: 'Deleted email template',
      changes: {
        name: template.name,
        subject: template.subject,
        body: template.body,
        isGlobal: template.isGlobal,
        companyId: template.companyId,
        createdBy: template.createdBy,
      },
    });

    await this.burst({ companyId, templateId });
    this.logger.info({ templateId }, 'ivemail:delete:done');
    return { message: 'Template deleted successfully' };
  }

  async seedSystemEmailTemplates() {
    this.logger.info({}, 'ivemail:seed:start');

    const templates = [
      {
        name: 'Default Interview Invite',
        subject: 'Interview Invitation at {{companyName}}',
        body: `Dear {{candidateName}},\n\nWe’re pleased to invite you to the {{stage}} interview for the {{jobTitle}} position at {{companyName}}.\n\n📅 Scheduled Date: {{interviewDate}}\n🕒 Time: {{interviewTime}}\n💬 Mode: {{interviewMode}}\n🔗 Meeting Link: {{meetingLink}}\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,  \n{{recruiterName}}  \n{{companyName}} Recruitment Team`,
      },
      {
        name: 'Interview Reschedule Notice',
        subject: 'Your Interview Has Been Rescheduled',
        body: `Hi {{candidateName}},\n\nYour interview for the {{jobTitle}} role has been rescheduled.\n\n📅 New Date: {{interviewDate}}  \n🕒 Time: {{interviewTime}}  \n🔗 Updated Link: {{meetingLink}}\n\nSorry for any inconvenience, and thank you for your flexibility.\n\nRegards,  \n{{recruiterName}}  \n{{companyName}}`,
      },
      {
        name: 'Onsite Interview Preparation',
        subject: 'Preparing for Your Onsite Interview',
        body: `Hi {{candidateName}},\n\nWe’re excited to host you for the upcoming onsite interview at {{companyName}} for the {{jobTitle}} role.\n\n📍 Location: {{onsiteLocation}}  \n📅 Date: {{interviewDate}}  \n🕒 Time: {{interviewTime}}\n\nKindly bring along a valid ID and any relevant materials. Let us know if you need directions or assistance.\n\nBest,  \n{{recruiterName}}  \nTalent Team – {{companyName}}`,
      },
    ];

    for (const tmpl of templates) {
      await this.db
        .insert(interviewEmailTemplates)
        .values({
          name: tmpl.name,
          subject: tmpl.subject,
          body: tmpl.body,
          isGlobal: true,
        })
        .execute();
    }

    await this.burst({});
    this.logger.info({}, 'ivemail:seed:done');
    return { success: true };
  }
}
