import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, or } from 'drizzle-orm';
import { offerLetterTemplates } from './schema/offer-letter-templates.schema';
import { globalTemplates } from './seed/globalTemplates';
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';
import { extractHandlebarsVariables } from 'src/utils/extractHandlebarsVariables';
import { offerLetterTemplateVariables } from './schema/offer-letter-template-variables.schema';
import { offerLetterTemplateVariableLinks } from './schema/offer-letter-template-variable-links.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class OfferLetterService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(OfferLetterService.name);
  }

  // ---------- cache keys ----------
  private sysListKey() {
    return `offer:system:list`;
  }
  private companyListKey(companyId: string) {
    return `offer:company:${companyId}:list`;
  }
  private companyNamesKey(companyId: string) {
    return `offer:company:${companyId}:names`; // id + name projection
  }
  private combinedKey(companyId: string) {
    return `offer:${companyId}:combined`; // { companyTemplates, systemTemplates }
  }
  private tmplDetailKey(templateId: string) {
    return `offer:template:${templateId}:detail`;
  }
  private async burst(opts: {
    companyId?: string;
    templateId?: string;
    system?: boolean;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.system) jobs.push(this.cache.del(this.sysListKey()));
    if (opts.companyId) {
      jobs.push(this.cache.del(this.companyListKey(opts.companyId)));
      jobs.push(this.cache.del(this.companyNamesKey(opts.companyId)));
      jobs.push(this.cache.del(this.combinedKey(opts.companyId)));
    }
    if (opts.templateId)
      jobs.push(this.cache.del(this.tmplDetailKey(opts.templateId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:offer');
  }

  // ---------- seed system templates ----------
  async seedSystemOfferLetterTemplates() {
    this.logger.info({}, 'offer:seed:start');

    const existing = await this.db
      .select({ id: offerLetterTemplates.id })
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.isSystemTemplate, true),
          eq(offerLetterTemplates.isDefault, true),
        ),
      )
      .execute();

    if (existing.length > 0) {
      this.logger.warn({}, 'offer:seed:already-exists');
      throw new BadRequestException(
        'System offer letter templates already exist. Cannot seed again.',
      );
    }

    for (const template of globalTemplates) {
      const [insertedTemplate] = await this.db
        .insert(offerLetterTemplates)
        .values(template)
        .returning()
        .execute();

      const variables = extractHandlebarsVariables(template.content);
      for (const variable of variables) {
        const [existingVar] = await this.db
          .select()
          .from(offerLetterTemplateVariables)
          .where(eq(offerLetterTemplateVariables.name, variable))
          .limit(1)
          .execute();

        let variableId = (existingVar as any)?.id as string | undefined;
        if (!variableId) {
          const [createdVar] = await this.db
            .insert(offerLetterTemplateVariables)
            .values({ name: variable })
            .returning()
            .execute();
          variableId = createdVar.id;
        }

        await this.db
          .insert(offerLetterTemplateVariableLinks)
          .values({ templateId: insertedTemplate.id, variableId })
          .execute();
      }
    }

    await this.burst({ system: true });
    this.logger.info({}, 'offer:seed:done');
  }

  // ---------- clone system -> company ----------
  async cloneCompanyTemplate(user: User, templateId: string) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'offer:clone:start');

    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.isSystemTemplate, true),
        ),
      )
      .execute();

    if (!template) {
      this.logger.warn({ companyId, templateId }, 'offer:clone:not-found');
      throw new BadRequestException('Template not found');
    }

    const alreadyExists = await this.db
      .select({ id: offerLetterTemplates.id })
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.companyId, companyId),
          eq(offerLetterTemplates.name, template.name),
        ),
      )
      .execute();

    if (alreadyExists.length) {
      this.logger.warn(
        { companyId, name: template.name },
        'offer:clone:duplicate',
      );
      throw new BadRequestException('This template has already been cloned.');
    }

    const [cloned] = await this.db
      .insert(offerLetterTemplates)
      .values({
        name: template.name,
        content: template.content,
        companyId,
        isSystemTemplate: false,
        isDefault: false,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'clone',
      entity: 'offer_letter_template',
      entityId: cloned.id,
      userId: id,
      details: `Cloned system template "${template.name}" into company "${companyId}"`,
      changes: cloned,
    });

    await this.burst({ companyId, templateId: cloned.id });
    this.logger.info({ id: cloned.id }, 'offer:clone:done');
    return cloned;
  }

  // ---------- create company template ----------
  async createCompanyTemplate(user: User, dto: CreateOfferTemplateDto) {
    const { companyId, id } = user;
    this.logger.info({ companyId, name: dto?.name }, 'offer:create:start');

    const duplicate = await this.db
      .select({ id: offerLetterTemplates.id })
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.companyId, companyId),
          eq(offerLetterTemplates.name, dto.name),
        ),
      )
      .execute();

    if (duplicate.length) {
      this.logger.warn({ companyId, name: dto.name }, 'offer:create:duplicate');
      throw new BadRequestException(
        'Template with this name already exists for the company',
      );
    }

    if (dto.isDefault) {
      await this.db
        .update(offerLetterTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(offerLetterTemplates.companyId, companyId),
            eq(offerLetterTemplates.isDefault, true),
          ),
        )
        .execute();
    }

    const [template] = await this.db
      .insert(offerLetterTemplates)
      .values({
        name: dto.name,
        content: dto.content,
        companyId,
        isSystemTemplate: false,
        isDefault: dto.isDefault ?? false,
      })
      .returning()
      .execute();

    const vars = extractHandlebarsVariables(dto.content);

    for (const variableName of vars) {
      const [existingVar] = await this.db
        .select()
        .from(offerLetterTemplateVariables)
        .where(
          and(
            eq(offerLetterTemplateVariables.name, variableName),
            eq(offerLetterTemplateVariables.companyId, companyId),
          ),
        )
        .limit(1)
        .execute();

      let variableId: string;
      if (existingVar) {
        variableId = existingVar.id;
      } else {
        const [createdVar] = await this.db
          .insert(offerLetterTemplateVariables)
          .values({ name: variableName, companyId, isSystem: false })
          .returning()
          .execute();
        variableId = createdVar.id;
      }

      await this.db
        .insert(offerLetterTemplateVariableLinks)
        .values({ templateId: template.id, variableId })
        .execute();
    }

    await this.auditService.logAction({
      action: 'create',
      entity: 'offer_letter_template',
      entityId: template.id,
      userId: id,
      details: 'Created company offer-letter template',
      changes: template,
    });

    await this.burst({ companyId, templateId: template.id });
    this.logger.info({ id: template.id }, 'offer:create:done');
    return template;
  }

  // ---------- reads (cached) ----------
  async getCompanyTemplates(companyId: string) {
    const key = this.combinedKey(companyId);
    this.logger.debug(
      { key, companyId },
      'offer:getCompanyTemplates:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const [companyTemplates, systemTemplates] = await Promise.all([
        this.db
          .select()
          .from(offerLetterTemplates)
          .where(eq(offerLetterTemplates.companyId, companyId))
          .execute(),
        this.db
          .select()
          .from(offerLetterTemplates)
          .where(eq(offerLetterTemplates.isSystemTemplate, true))
          .execute(),
      ]);
      this.logger.debug(
        {
          companyId,
          companyCount: companyTemplates.length,
          systemCount: systemTemplates.length,
        },
        'offer:getCompanyTemplates:db:done',
      );
      return { companyTemplates, systemTemplates };
    });
  }

  async getCompanyOfferTemplates(companyId: string) {
    const key = this.companyNamesKey(companyId);
    this.logger.debug(
      { key, companyId },
      'offer:getCompanyOfferTemplates:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({
          id: offerLetterTemplates.id,
          name: offerLetterTemplates.name,
        })
        .from(offerLetterTemplates)
        .where(eq(offerLetterTemplates.companyId, companyId))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'offer:getCompanyOfferTemplates:db:done',
      );
      return rows;
    });
  }

  async getTemplateById(templateId: string, companyId: string) {
    const key = this.tmplDetailKey(templateId);
    this.logger.debug(
      { key, templateId, companyId },
      'offer:getTemplateById:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
      const [template] = await this.db
        .select()
        .from(offerLetterTemplates)
        .where(
          and(
            eq(offerLetterTemplates.id, templateId),
            or(
              eq(offerLetterTemplates.companyId, companyId),
              eq(offerLetterTemplates.isSystemTemplate, true),
            ),
          ),
        )
        .execute();
      return template ?? null;
    });

    if (!row) {
      this.logger.warn(
        { templateId, companyId },
        'offer:getTemplateById:not-found',
      );
      throw new BadRequestException('Template not found');
    }

    return row;
  }

  // ---------- update/delete ----------
  async updateTemplate(
    templateId: string,
    user: User,
    dto: UpdateOfferTemplateDto,
  ) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'offer:update:start');

    const [existingTemplate] = await this.db
      .select({ id: offerLetterTemplates.id })
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.companyId, companyId),
        ),
      )
      .execute();

    if (!existingTemplate) {
      this.logger.warn({ companyId, templateId }, 'offer:update:not-found');
      throw new BadRequestException('Template not found');
    }

    if (dto.isDefault) {
      await this.db
        .update(offerLetterTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(offerLetterTemplates.companyId, companyId),
            eq(offerLetterTemplates.isDefault, true),
          ),
        )
        .execute();
    }

    const [updatedTemplate] = await this.db
      .update(offerLetterTemplates)
      .set({
        name: dto.name,
        content: dto.content,
        isDefault: dto.isDefault || false,
      })
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'offer_letter_template',
      entityId: updatedTemplate.id,
      userId: id,
      details: 'Updated offer-letter template',
      changes: dto,
    });

    await this.burst({ companyId, templateId });
    this.logger.info({ id: templateId }, 'offer:update:done');
    return updatedTemplate;
  }

  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, templateId }, 'offer:delete:start');

    await this.db
      .delete(offerLetterTemplateVariableLinks)
      .where(eq(offerLetterTemplateVariableLinks.templateId, templateId))
      .execute();

    const [deleted] = await this.db
      .delete(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'offer_letter_template',
      entityId: templateId,
      userId: id,
      details: 'Deleted offer-letter template',
      changes: deleted,
    });

    await this.burst({ companyId, templateId });
    this.logger.info({ id: templateId }, 'offer:delete:done');
    return { message: 'Template deleted successfully' };
  }
}
