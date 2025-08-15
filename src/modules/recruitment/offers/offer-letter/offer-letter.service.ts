import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, or, asc } from 'drizzle-orm';
import { offerLetterTemplates } from './schema/offer-letter-templates.schema';
import { globalTemplates } from './seed/globalTemplates';
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';
import { extractHandlebarsVariables } from 'src/utils/extractHandlebarsVariables';
import { offerLetterTemplateVariables } from './schema/offer-letter-template-variables.schema';
import { offerLetterTemplateVariableLinks } from './schema/offer-letter-template-variable-links.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class OfferLetterService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is companyId or "global"
    return [`company:${scope}:offers`, `company:${scope}:offers:templates`];
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SYSTEM SEED (write): bump "global" cache scope
  // ────────────────────────────────────────────────────────────────────────────
  async seedSystemOfferLetterTemplates() {
    const existing = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.isSystemTemplate, true),
          eq(offerLetterTemplates.isDefault, true),
        ),
      )
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException(
        'System offer letter templates already exist. Cannot seed again.',
      );
    }

    for (const template of globalTemplates) {
      // Insert the template
      const [insertedTemplate] = await this.db
        .insert(offerLetterTemplates)
        .values(template)
        .returning();

      const variables = extractHandlebarsVariables(template.content);

      for (const variable of variables) {
        // Ensure variable exists
        const [existingVar] = await this.db
          .select()
          .from(offerLetterTemplateVariables)
          .where(eq(offerLetterTemplateVariables.name, variable))
          .limit(1)
          .execute();

        let variableId = existingVar?.id;
        if (!variableId) {
          const [createdVar] = await this.db
            .insert(offerLetterTemplateVariables)
            .values({ name: variable })
            .returning();
          variableId = createdVar.id;
        }

        // Link template <-> variable
        await this.db.insert(offerLetterTemplateVariableLinks).values({
          templateId: insertedTemplate.id,
          variableId,
        });
      }
    }

    // Invalidate global-scoped consumers
    await this.cache.bumpCompanyVersion('global');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CLONE (write): bump company scope
  // ────────────────────────────────────────────────────────────────────────────
  async cloneCompanyTemplate(user: User, templateId: string) {
    const { companyId, id } = user;

    // Get system template
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
      throw new BadRequestException('Template not found');
    }

    // Before insert
    const alreadyExists = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.companyId, companyId),
          eq(offerLetterTemplates.name, template.name),
        ),
      )
      .execute();

    if (alreadyExists.length) {
      throw new BadRequestException('This template has already been cloned.');
    }

    // Insert cloned version for company
    const [cloned] = await this.db
      .insert(offerLetterTemplates)
      .values({
        name: template.name,
        content: template.content,
        companyId,
        isSystemTemplate: false,
        isDefault: false,
      })
      .returning();

    await this.auditService.logAction({
      action: 'clone',
      entity: 'offer_letter_template',
      entityId: cloned.id,
      userId: id,
      details: `Cloned system template "${template.name}" into company "${companyId}"`,
      changes: cloned,
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return cloned;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CREATE (write): bump company scope
  // ────────────────────────────────────────────────────────────────────────────
  async createCompanyTemplate(user: User, dto: CreateOfferTemplateDto) {
    const { companyId, id } = user;

    // 1) Uniqueness
    const duplicate = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.companyId, companyId),
          eq(offerLetterTemplates.name, dto.name),
        ),
      )
      .execute();

    if (duplicate.length) {
      throw new BadRequestException(
        'Template with this name already exists for the company',
      );
    }

    // 2) Ensure single default per company
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

    // 3) Insert template
    const [template] = await this.db
      .insert(offerLetterTemplates)
      .values({
        name: dto.name,
        content: dto.content,
        companyId,
        isSystemTemplate: false,
        isDefault: dto.isDefault ?? false,
      })
      .returning();

    // 4) Extract & upsert variables + links
    const vars = extractHandlebarsVariables(dto.content);

    for (const variableName of vars) {
      // a) Ensure variable exists (company-scoped preferred here)
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
          .values({
            name: variableName,
            companyId,
            isSystem: false,
          })
          .returning();

        variableId = createdVar.id;
      }

      // b) Link
      await this.db.insert(offerLetterTemplateVariableLinks).values({
        templateId: template.id,
        variableId,
      });
    }

    await this.auditService.logAction({
      action: 'create',
      entity: 'offer_letter_template',
      entityId: template.id,
      userId: id,
      details: 'Created company offer-letter template',
      changes: template,
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return template;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // READ (cached): company + system templates together
  // ────────────────────────────────────────────────────────────────────────────
  async getCompanyTemplates(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['offers', 'templates', 'all'],
      async () => {
        const [companyTemplates, systemTemplates] = await Promise.all([
          this.db
            .select()
            .from(offerLetterTemplates)
            .where(eq(offerLetterTemplates.companyId, companyId))
            .orderBy(asc(offerLetterTemplates.name))
            .execute(),
          this.db
            .select()
            .from(offerLetterTemplates)
            .where(eq(offerLetterTemplates.isSystemTemplate, true))
            .orderBy(asc(offerLetterTemplates.name))
            .execute(),
        ]);

        return { companyTemplates, systemTemplates };
      },
      {
        tags: [...this.tags(companyId), ...this.tags('global')],
      },
    );
  }

  // READ (cached): compact list for company picker
  async getCompanyOfferTemplates(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['offers', 'templates', 'companyList'],
      async () => {
        const companyTemplates = await this.db
          .select({
            id: offerLetterTemplates.id,
            name: offerLetterTemplates.name,
          })
          .from(offerLetterTemplates)
          .where(eq(offerLetterTemplates.companyId, companyId))
          .orderBy(asc(offerLetterTemplates.name))
          .execute();

        return companyTemplates;
      },
      { tags: this.tags(companyId) },
    );
  }

  // READ (cached): detail (visible if company-owned or system)
  async getTemplateById(templateId: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['offers', 'templates', 'detail', templateId],
      async () => {
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

        if (!template) {
          throw new BadRequestException('Template not found');
        }

        return template;
      },
      {
        tags: [...this.tags(companyId), ...this.tags('global')],
      },
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UPDATE (write): bump company scope
  // ────────────────────────────────────────────────────────────────────────────
  async updateTemplate(
    templateId: string,
    user: User,
    dto: UpdateOfferTemplateDto,
  ) {
    const { companyId, id } = user;

    // Check exists (company-owned)
    const [existingTemplate] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.companyId, companyId),
        ),
      )
      .execute();

    if (!existingTemplate) {
      throw new BadRequestException('Template not found');
    }

    // Ensure single default per company
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

    // Update
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
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'offer_letter_template',
      entityId: updatedTemplate.id,
      userId: id,
      details: 'Updated offer-letter template',
      changes: dto,
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return updatedTemplate;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE (write): bump company scope
  // ────────────────────────────────────────────────────────────────────────────
  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;

    // Remove links first
    await this.db
      .delete(offerLetterTemplateVariableLinks)
      .where(eq(offerLetterTemplateVariableLinks.templateId, templateId))
      .execute();

    // Delete template
    const [deleted] = await this.db
      .delete(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.companyId, companyId),
        ),
      )
      .returning();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'offer_letter_template',
      entityId: templateId,
      userId: id,
      details: 'Deleted offer-letter template',
      changes: deleted,
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return { message: 'Template deleted successfully' };
  }
}
