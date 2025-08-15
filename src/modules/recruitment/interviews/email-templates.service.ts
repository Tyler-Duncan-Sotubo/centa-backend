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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class InterviewEmailTemplateService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is companyId or "global"
    return [`company:${scope}:emails`, `company:${scope}:emails:templates`];
  }

  // READ (cached): includes system templates + company templates
  async getAllTemplates(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['emails', 'templates', 'all'],
      async () => {
        const templates = await this.db
          .select()
          .from(interviewEmailTemplates)
          .where(
            or(
              isNull(interviewEmailTemplates.companyId), // system/global
              eq(interviewEmailTemplates.companyId, companyId), // company
            ),
          )
          .orderBy(asc(interviewEmailTemplates.createdAt))
          .execute();

        return templates;
      },
      {
        tags: [...this.tags(companyId), ...this.tags('global')],
      },
    );
  }

  // CREATE (write): bump company cache
  async create(user: User, dto: CreateEmailTemplateDto) {
    const { companyId, id } = user;

    const [template] = await this.db
      .insert(interviewEmailTemplates)
      .values({
        ...dto,
        companyId,
        isGlobal: false,
        createdBy: id,
      })
      .returning();

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

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return template;
  }

  // CLONE (write): bump company cache
  async cloneTemplate(templateId: string, user: User) {
    const { companyId, id } = user;

    // only system/global templates can be cloned
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

    if (!template) throw new NotFoundException('System template not found');

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
      .returning();

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

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return cloned;
  }

  // DELETE (write): bump company cache
  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;

    // 1) Fetch the template and ensure visibility
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
      throw new NotFoundException(`Template not found`);
    }
    if (template.isGlobal) {
      throw new BadRequestException(`System templates cannot be deleted`);
    }

    // 2) Check if any interviews are using this template
    const inUse = await this.db.query.interviews.findFirst({
      where: eq(interviews.emailTemplateId, templateId),
    });

    if (inUse) {
      throw new BadRequestException(
        `Cannot delete: This template is being used in one or more interviews`,
      );
    }

    // 3) Proceed with deletion
    await this.db
      .delete(interviewEmailTemplates)
      .where(eq(interviewEmailTemplates.id, templateId));

    // 4) Audit
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

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return { message: 'Template deleted successfully' };
  }

  // SEED SYSTEM (write): bump "global" cache scope
  async seedSystemEmailTemplates() {
    const templates = [
      {
        name: 'Default Interview Invite',
        subject: 'Interview Invitation at {{companyName}}',
        body: `Dear {{candidateName}},
  
We’re pleased to invite you to the {{stage}} interview for the {{jobTitle}} position at {{companyName}}.

📅 Scheduled Date: {{interviewDate}}
🕒 Time: {{interviewTime}}
💬 Mode: {{interviewMode}}
🔗 Meeting Link: {{meetingLink}}

If you have any questions, feel free to reply to this email.

Best regards,
{{recruiterName}}
{{companyName}} Recruitment Team`,
      },
      {
        name: 'Interview Reschedule Notice',
        subject: 'Your Interview Has Been Rescheduled',
        body: `Hi {{candidateName}},

Your interview for the {{jobTitle}} role has been rescheduled.

📅 New Date: {{interviewDate}}
🕒 Time: {{interviewTime}}
🔗 Updated Link: {{meetingLink}}

Sorry for any inconvenience, and thank you for your flexibility.

Regards,
{{recruiterName}}
{{companyName}}`,
      },
      {
        name: 'Onsite Interview Preparation',
        subject: 'Preparing for Your Onsite Interview',
        body: `Hi {{candidateName}},

We’re excited to host you for the upcoming onsite interview at {{companyName}} for the {{jobTitle}} role.

📍 Location: {{onsiteLocation}}
📅 Date: {{interviewDate}}
🕒 Time: {{interviewTime}}

Kindly bring along a valid ID and any relevant materials. Let us know if you need directions or assistance.

Best,
{{recruiterName}}
Talent Team – {{companyName}}`,
      },
    ];

    for (const tmpl of templates) {
      await this.db.insert(interviewEmailTemplates).values({
        name: tmpl.name,
        subject: tmpl.subject,
        body: tmpl.body,
        isGlobal: true,
      });
    }

    // Invalidate system/global cache consumers
    await this.cache.bumpCompanyVersion('global');

    return { success: true };
  }
}
