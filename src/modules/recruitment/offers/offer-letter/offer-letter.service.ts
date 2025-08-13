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

@Injectable()
export class OfferLetterService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async seedSystemOfferLetterTemplates() {
    const existing = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.isSystemTemplate, true),
          eq(offerLetterTemplates.isDefault, true),
        ),
      );

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
  }

  // Company Template Clone
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
      );

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
      );

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

    return cloned;
  }

  // Create a new template for a company
  async createCompanyTemplate(user: User, dto: CreateOfferTemplateDto) {
    const { companyId, id } = user;
    /* ───── 1. Uniqueness check ───── */
    const duplicate = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.companyId, companyId),
          eq(offerLetterTemplates.name, dto.name),
        ),
      );

    if (duplicate.length) {
      throw new BadRequestException(
        'Template with this name already exists for the company',
      );
    }

    /* ───── 2. Ensure single default per company ───── */
    if (dto.isDefault) {
      await this.db
        .update(offerLetterTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(offerLetterTemplates.companyId, companyId),
            eq(offerLetterTemplates.isDefault, true),
          ),
        );
    }

    /* ───── 3. Insert the template ───── */
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

    /* ───── 4. Extract & up-sert variables ───── */
    const vars = extractHandlebarsVariables(dto.content);

    for (const variableName of vars) {
      // 4a. Ensure variable exists (system or tenant)
      const [existingVar] = await this.db
        .select()
        .from(offerLetterTemplateVariables)
        .where(
          and(
            eq(offerLetterTemplateVariables.name, variableName),
            eq(offerLetterTemplateVariables.companyId, companyId), // null for system vars is fine
          ),
        )
        .limit(1)
        .execute();

      let variableId: string;

      if (existingVar) {
        variableId = existingVar.id;
      } else {
        // Create new company-specific variable
        const [createdVar] = await this.db
          .insert(offerLetterTemplateVariables)
          .values({
            name: variableName,
            companyId, // leave NULL if you want it global; here we mark tenant-specific
            isSystem: false,
          })
          .returning();

        variableId = createdVar.id;
      }

      // 4b. Link template <-> variable
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

    return template;
  }

  // Get all templates for a company
  async getCompanyTemplates(companyId: string) {
    const [companyTemplates, systemTemplates] = await Promise.all([
      this.db
        .select()
        .from(offerLetterTemplates)
        .where(eq(offerLetterTemplates.companyId, companyId)),

      this.db
        .select()
        .from(offerLetterTemplates)
        .where(eq(offerLetterTemplates.isSystemTemplate, true)),
    ]);

    return {
      companyTemplates,
      systemTemplates,
    };
  }

  async getCompanyOfferTemplates(companyId: string) {
    const companyTemplates = await this.db
      .select({
        id: offerLetterTemplates.id,
        name: offerLetterTemplates.name,
      })
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.companyId, companyId));

    return companyTemplates;
  }

  // Get a specific template by ID
  async getTemplateById(templateId: string, companyId: string) {
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
      );

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    return template;
  }

  // Update a template by ID
  async updateTemplate(
    templateId: string,
    user: User,
    dto: UpdateOfferTemplateDto,
  ) {
    const { companyId, id } = user;
    // Check if the template exists
    const [existingTemplate] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(
        and(
          eq(offerLetterTemplates.id, templateId),
          eq(offerLetterTemplates.companyId, companyId),
        ),
      );

    if (!existingTemplate) {
      throw new BadRequestException('Template not found');
    }

    // Optional: ensure only one default per company
    if (dto.isDefault) {
      await this.db
        .update(offerLetterTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(offerLetterTemplates.companyId, companyId),
            eq(offerLetterTemplates.isDefault, true),
          ),
        );
    }

    // Update the template
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

    return updatedTemplate;
  }

  // Delete a template by ID
  async deleteTemplate(templateId: string, user: User) {
    const { companyId, id } = user;

    await this.db
      .delete(offerLetterTemplateVariableLinks)
      .where(eq(offerLetterTemplateVariableLinks.templateId, templateId));

    // 1. Delete the template
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

    return { message: 'Template deleted successfully' };
  }
}
