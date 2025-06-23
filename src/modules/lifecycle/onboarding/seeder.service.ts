import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { onboardingTemplates } from './schema/onboarding-templates.schema';
import { onboardingTemplateChecklists } from './schema/onboarding-template-checklists.schema';
import { onboardingTemplateFields } from './schema/onboarding-template-fields.schema';
import { CreateOnboardingTemplateDto } from './dto/create-onboarding-template.dto';
import { and, asc, eq } from 'drizzle-orm';
import { employeeOnboarding } from '../schema';

@Injectable()
export class OnboardingSeederService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async seedGlobalOnboardingTemplate() {
    await this.seedTemplate({
      name: 'Full-Time Employee Onboarding',
      description:
        'Standard onboarding for full-time hires across all companies.',
      fields: [
        ['dateOfBirth', 'Date of Birth', 'date', 'profile'],
        ['gender', 'Gender', 'select', 'profile'],
        ['maritalStatus', 'Marital Status', 'select', 'profile'],
        ['address', 'Address', 'text', 'profile'],
        ['country', 'Country', 'text', 'profile'],
        ['phone', 'Phone', 'text', 'profile'],
        ['emergencyName', 'Emergency Contact Name', 'text', 'profile'],
        ['emergencyPhone', 'Emergency Contact Phone', 'text', 'profile'],
        ['bankName', 'Bank Name', 'select', 'finance'],
        ['bankAccountNumber', 'Bank Account Number', 'text', 'finance'],
        ['bankAccountName', 'Bank Account Name', 'text', 'finance'],
        ['bankBranch', 'Bank Branch', 'text', 'finance'],
        ['tin', 'Tax Identification Number (TIN)', 'text', 'finance'],
        ['pensionPin', 'Pension PIN', 'text', 'finance'],
        ['nhfNumber', 'NHF Number', 'text', 'finance'],
        ['idUpload', 'Upload Valid ID', 'file', 'document'],
      ],
      checklist: [
        'Fill Personal Details',
        'Add Bank and Tax Info',
        'Upload Valid ID',
        'Sign Offer Letter',
        'Attend onboarding call',
      ],
    });
  }

  async seedInternTemplate() {
    await this.seedTemplate({
      name: 'Intern Onboarding',
      description: 'Streamlined onboarding for internship hires.',
      fields: [
        ['dateOfBirth', 'Date of Birth', 'date', 'profile'],
        ['gender', 'Gender', 'select', 'profile'],
        ['maritalStatus', 'Marital Status', 'select', 'profile'],
        ['address', 'Address', 'text', 'profile'],
        ['country', 'Country', 'text', 'profile'],
        ['phone', 'Phone', 'text', 'profile'],
        ['bankName', 'Bank Name', 'select', 'finance'],
        ['bankAccountNumber', 'Bank Account Number', 'text', 'finance'],
        ['bankAccountName', 'Bank Account Name', 'text', 'finance'],
        ['bankBranch', 'Bank Branch', 'text', 'finance'],
        ['tin', 'Tax Identification Number (TIN)', 'text', 'finance'],
        ['pensionPin', 'Pension PIN', 'text', 'finance'],
        ['nhfNumber', 'NHF Number', 'text', 'finance'],
        ['emergencyName', 'Emergency Contact Name', 'text', 'profile'],
        ['emergencyPhone', 'Emergency Contact Phone', 'text', 'profile'],
        ['idUpload', 'Upload Student ID', 'file', 'document'],
      ],
      checklist: [
        'Fill Basic Personal Details',
        'Add Bank and Tax Info',
        'Upload Student ID',
        'Sign Offer Letter',
        'Attend onboarding call',
      ],
    });
  }

  async seedContractorTemplate() {
    await this.seedTemplate({
      name: 'Contract Staff Onboarding',
      description: 'Onboarding for external or contract-based employees.',
      fields: [
        ['dateOfBirth', 'Date of Birth', 'date', 'profile'],
        ['gender', 'Gender', 'select', 'profile'],
        ['phone', 'Phone', 'text', 'profile'],
        ['bankName', 'Bank Name', 'select', 'finance'],
        ['bankAccountNumber', 'Bank Account Number', 'text', 'finance'],
        ['bankAccountName', 'Bank Account Name', 'text', 'finance'],
        ['bankBranch', 'Bank Branch', 'text', 'finance'],
        ['tin', 'Tax Identification Number (TIN)', 'text', 'finance'],
        ['pensionPin', 'Pension PIN', 'text', 'finance'],
        ['nhfNumber', 'NHF Number', 'text', 'finance'],
        ['idUpload', 'Upload Signed Contract', 'file', 'document'],
      ],
      checklist: [
        'Complete Basic Info',
        'Add Bank and Tax Info',
        'Upload Signed Contract',
        'Sign Offer Letter',
        'Attend onboarding call',
      ],
    });
  }

  async seedAllGlobalTemplates() {
    await Promise.all([
      this.seedGlobalOnboardingTemplate(),
      this.seedInternTemplate(),
      this.seedContractorTemplate(),
    ]);
  }

  private async seedTemplate({
    name,
    description,
    fields,
    checklist,
  }: {
    name: string;
    description: string;
    fields: [string, string, string, string][];
    checklist: string[];
  }) {
    const existing = await this.db.query.onboardingTemplates.findFirst({
      where: (template, { eq }) => eq(template.name, name),
    });

    if (existing) {
      return;
    }

    const [template] = await this.db
      .insert(onboardingTemplates)
      .values({
        name,
        description,
        isGlobal: true,
        companyId: null,
        status: 'published',
        createdAt: new Date(),
      })
      .returning();

    if (!template)
      throw new BadRequestException(`Failed to insert template: ${name}`);

    await this.db.insert(onboardingTemplateFields).values(
      fields.map((f, i) => ({
        templateId: template.id,
        fieldKey: f[0],
        label: f[1],
        fieldType: f[2],
        required: true,
        order: i + 1,
        tag: f[3],
      })),
    );

    await this.db.insert(onboardingTemplateChecklists).values(
      checklist.map((title, i) => ({
        templateId: template.id,
        title,
        assignee: 'employee' as const,
        order: i + 1,
        dueDaysAfterStart: i,
      })),
    );
  }

  async cloneTemplateForCompany(
    globalTemplateId: string,
    companyId: string,
    templateName?: string,
  ) {
    // Step 1: Fetch the global template
    const globalTemplate = await this.db.query.onboardingTemplates.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.id, globalTemplateId), eq(t.isGlobal, true)),
    });

    if (!globalTemplate) {
      throw new BadRequestException(`Global template not found`);
    }

    // Check if a template with the same name already exists for this company
    const existingTemplate = await this.db
      .select()
      .from(onboardingTemplates)
      .where(
        and(
          eq(
            onboardingTemplates.name,
            templateName || `${globalTemplate.name} (Cloned)`,
          ),
          eq(onboardingTemplates.companyId, companyId),
          eq(onboardingTemplates.isGlobal, false),
        ),
      )
      .execute();

    if (existingTemplate.length > 0) {
      throw new BadRequestException(
        `Template with name "${templateName || globalTemplate.name}" already exists for this company.`,
      );
    }

    // Step 2: Create cloned template for the company
    const [clonedTemplate] = await this.db
      .insert(onboardingTemplates)
      .values({
        name: templateName || `${globalTemplate.name} (Cloned)`,
        description: globalTemplate.description,
        isGlobal: false,
        companyId,
        status: 'draft', // Start as draft
        createdAt: new Date(),
      })
      .returning();

    // Step 3: Clone template fields
    const fields = await this.db.query.onboardingTemplateFields.findMany({
      where: (f, { eq }) => eq(f.templateId, globalTemplate.id),
    });

    await this.db.insert(onboardingTemplateFields).values(
      fields.map((field) => ({
        templateId: clonedTemplate.id,
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        order: field.order,
        tag: field.tag,
      })),
    );

    // Step 4: Clone checklist items
    const checklist = await this.db.query.onboardingTemplateChecklists.findMany(
      {
        where: (c, { eq }) => eq(c.templateId, globalTemplate.id),
      },
    );

    await this.db.insert(onboardingTemplateChecklists).values(
      checklist.map((item) => ({
        templateId: clonedTemplate.id,
        title: item.title,
        assignee: item.assignee,
        order: item.order,
        dueDaysAfterStart: item.dueDaysAfterStart,
      })),
    );

    return clonedTemplate;
  }

  async createCompanyTemplate(
    companyId: string,
    dto: CreateOnboardingTemplateDto,
  ) {
    const { name, description, fields, checklist } = dto;

    // check if template with same name already exists
    const existingTemplate = await this.db
      .select()
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.name, name),
          eq(onboardingTemplates.companyId, companyId),
          eq(onboardingTemplates.isGlobal, false),
        ),
      )
      .execute();

    if (existingTemplate.length > 0) {
      throw new BadRequestException(
        `Template with name "${name}" already exists for this company.`,
      );
    }

    // 1. Insert the new template
    const [template] = await this.db
      .insert(onboardingTemplates)
      .values({
        name,
        description,
        isGlobal: false,
        companyId,
        status: 'draft',
        createdAt: new Date(),
      })
      .returning();

    if (!template)
      throw new BadRequestException('Failed to create company template');

    // 2. Insert fields
    if (fields.length) {
      await Promise.all(
        fields.map(async (f, i) => {
          // Always insert into template
          await this.db.insert(onboardingTemplateFields).values({
            templateId: template.id,
            fieldKey: f.fieldKey,
            label: f.label,
            fieldType: f.fieldType,
            required: f.required ?? true,
            order: f.order ?? i + 1,
            tag: f.tag ?? 'profile', // Default tag if not provided
          });
        }),
      );
    }

    // 3. Insert checklist
    if (checklist.length) {
      await this.db.insert(onboardingTemplateChecklists).values(
        checklist.map((item, i) => ({
          templateId: template.id,
          title: item.title,
          assignee: item.assignee,
          dueDaysAfterStart: item.dueDaysAfterStart ?? 0,
          order: item.order ?? i + 1,
        })),
      );
    }

    return template;
  }

  async updateTemplateById(
    templateId: string,
    dto: CreateOnboardingTemplateDto,
  ) {
    const { name, description, fields, checklist } = dto;

    // Check if employee is using the template
    const existingTemplate = await this.db
      .select()
      .from(employeeOnboarding)
      .where(
        and(
          eq(employeeOnboarding.templateId, templateId),
          eq(employeeOnboarding.status, 'pending'),
        ),
      )
      .execute();

    if (existingTemplate.length > 0) {
      throw new BadRequestException(
        `Template is currently in use by employees. Cannot update.`,
      );
    }

    // 1. Update template base info
    await this.db
      .update(onboardingTemplates)
      .set({ name, description })
      .where(eq(onboardingTemplates.id, templateId));

    // 2. Clear existing fields
    await this.db
      .delete(onboardingTemplateFields)
      .where(eq(onboardingTemplateFields.templateId, templateId));

    // 3. Insert new fields with order
    await this.db.insert(onboardingTemplateFields).values(
      fields.map((field, i) => ({
        templateId,
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        tag: field.tag,
        required: field.required,
        order: i,
      })),
    );

    // 4. Clear existing checklist
    await this.db
      .delete(onboardingTemplateChecklists)
      .where(eq(onboardingTemplateChecklists.templateId, templateId));

    // 5. Insert new checklist items with order
    await this.db.insert(onboardingTemplateChecklists).values(
      checklist.map((item, i) => ({
        templateId,
        title: item.title,
        assignee: item.assignee,
        dueDaysAfterStart: item.dueDaysAfterStart,
        order: i,
      })),
    );

    return { status: 'success' };
  }

  async getTemplatesByCompanySummaries(companyId: string) {
    const templates = await this.db
      .select({
        id: onboardingTemplates.id,
        name: onboardingTemplates.name,
      })
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.companyId, companyId),
          eq(onboardingTemplates.isGlobal, false),
        ),
      )
      .orderBy(asc(onboardingTemplates.createdAt));

    return templates;
  }

  async getTemplatesByCompany(companyId: string) {
    const templates = await this.db
      .select()
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.companyId, companyId),
          eq(onboardingTemplates.isGlobal, false),
        ),
      )
      .orderBy(asc(onboardingTemplates.createdAt));

    const templateSummaries = await Promise.all(
      templates.map(async (template) => {
        const fieldCount = await this.db
          .select()
          .from(onboardingTemplateFields)
          .where(eq(onboardingTemplateFields.templateId, template.id))
          .then((res) => res.length);

        const checklistCount = await this.db
          .select()
          .from(onboardingTemplateChecklists)
          .where(eq(onboardingTemplateChecklists.templateId, template.id))
          .then((res) => res.length);

        return {
          ...template,
          fieldCount,
          checklistCount,
        };
      }),
    );

    const globalTemplates = await this.db
      .select()
      .from(onboardingTemplates)
      .where(eq(onboardingTemplates.isGlobal, true))
      .orderBy(asc(onboardingTemplates.createdAt));

    return { templateSummaries, globalTemplates };
  }

  async getTemplatesByCompanyWithDetails(companyId: string) {
    const templates = await this.getTemplatesByCompany(companyId);
    const templateDetails = await Promise.all(
      templates.templateSummaries.map(async (template) => {
        const fields = await this.db.query.onboardingTemplateFields.findMany({
          where: (f, { eq }) => eq(f.templateId, template.id),
          orderBy: (f, { asc }) => asc(f.order),
        });

        const checklist =
          await this.db.query.onboardingTemplateChecklists.findMany({
            where: (c, { eq }) => eq(c.templateId, template.id),
            orderBy: (c, { asc }) => asc(c.order),
          });

        return {
          ...template,
          fields,
          checklist,
        };
      }),
    );

    return templateDetails;
  }

  async getTemplateByIdWithDetails(templateId: string) {
    const template = await this.db.query.onboardingTemplates.findFirst({
      where: (t, { eq }) => eq(t.id, templateId),
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const fields = await this.db.query.onboardingTemplateFields.findMany({
      where: (f, { eq }) => eq(f.templateId, templateId),
      orderBy: (f, { asc }) => asc(f.order),
    });

    const checklist = await this.db.query.onboardingTemplateChecklists.findMany(
      {
        where: (c, { eq }) => eq(c.templateId, templateId),
        orderBy: (c, { asc }) => asc(c.order),
      },
    );

    return {
      ...template,
      fields,
      checklist,
    };
  }
}
