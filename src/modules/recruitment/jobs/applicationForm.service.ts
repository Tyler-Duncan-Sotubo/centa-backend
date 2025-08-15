import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { application_form_fields } from './schema/application-form-fields.schema';
import { application_form_questions } from './schema/application-form-questions.schema';
import { application_form_configs } from './schema/application-form-configs.schema';
import { eq, asc } from 'drizzle-orm';
import { CreateFieldDto } from './dto/create-field.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { User } from 'src/common/types/user.type';
import { application_field_definitions } from './schema/application-field-definitions.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ApplicationFormService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is companyId or "global"
    return [
      `company:${scope}:applications`,
      `company:${scope}:applications:forms`,
      `company:${scope}:applications:fields`,
    ];
  }

  // WRITE → bump global cache (these are system defaults)
  async seedDefaultFields() {
    await this.db.insert(application_field_definitions).values(
      defaultFields.map((field, index) => ({
        section: field.section,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        isVisible: field.isVisible ?? true,
        isEditable: field.isEditable ?? true,
        order: index + 1,
      })),
    );

    await this.cache.bumpCompanyVersion('global');
  }

  // READ (cached, global scope)
  async getDefaultFields() {
    return this.cache.getOrSetVersioned(
      'global',
      ['applications', 'fields', 'defaults'],
      async () => {
        const fields = await this.db
          .select()
          .from(application_field_definitions);
        if (fields.length === 0) {
          throw new NotFoundException('No default fields found');
        }
        return fields;
      },
      { tags: this.tags('global') },
    );
  }

  // WRITE → upsert a job's form, then bump company + global (global used by preview cache below)
  async upsertApplicationForm(
    jobId: string,
    user: User,
    config: {
      style: 'resume_only' | 'form_only' | 'both';
      includeReferences?: boolean;
      customFields?: CreateFieldDto[];
      customQuestions?: CreateQuestionDto[];
    },
  ) {
    const existing = await this.db
      .select()
      .from(application_form_configs)
      .where(eq(application_form_configs.jobId, jobId));

    let formId: string;

    if (existing.length > 0) {
      formId = existing[0].id;
      await this.db
        .update(application_form_configs)
        .set({
          style: config.style,
          includeReferences: config.includeReferences ?? false,
        })
        .where(eq(application_form_configs.id, formId));
      // (optional) clear existing fields/questions if doing full overwrite
    } else {
      const [form] = await this.db
        .insert(application_form_configs)
        .values({
          jobId,
          style: config.style,
          includeReferences: config.includeReferences ?? false,
        })
        .returning();

      formId = form.id;
      // console.log('Created new application form config:', formId);
    }

    if (config.customFields?.length) {
      await this.db.insert(application_form_fields).values(
        config.customFields.map((f, i) => ({
          formId,
          section: f.section,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required ?? true,
          isVisible: f.isVisible ?? true,
          isEditable: f.isEditable ?? true,
          order: f.order ?? i + 1,
        })),
      );
    }

    if (config.customQuestions?.length) {
      await this.db.insert(application_form_questions).values(
        config.customQuestions.map((q, i) => ({
          companyId: user.companyId,
          formId,
          question: q.question,
          type: q.type,
          required: q.required ?? true,
          order: q.order ?? i + 1,
        })),
      );
    }

    // Invalidate: company-scoped consumers and any global-scoped previews keyed by jobId
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.bumpCompanyVersion('global');

    return { formId };
  }

  // READ (cached). We don’t receive companyId here, so cache under "global" scope keyed by jobId
  // and bump 'global' on writes above to invalidate.
  async getFormPreview(jobId: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['applications', 'forms', 'preview', jobId],
      async () => {
        const [config] = await this.db
          .select()
          .from(application_form_configs)
          .where(eq(application_form_configs.jobId, jobId));

        if (!config) {
          throw new NotFoundException(
            'Application form not configured for this job',
          );
        }

        const fields = await this.db
          .select()
          .from(application_form_fields)
          .where(eq(application_form_fields.formId, config.id))
          .orderBy(asc(application_form_fields.order));

        const questions = await this.db
          .select()
          .from(application_form_questions)
          .where(eq(application_form_questions.formId, config.id))
          .orderBy(asc(application_form_questions.order));

        return {
          style: config.style,
          includeReferences: config.includeReferences,
          fields,
          questions,
        };
      },
      { tags: this.tags('global') },
    );
  }
}

const defaultFields: Array<{
  section: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'file' | 'date' | 'select';
  required: boolean;
  isVisible?: boolean;
  isEditable?: boolean;
}> = [
  // 🔒 Personal
  {
    section: 'personal',
    label: 'Full Name',
    fieldType: 'text',
    required: true,
    isVisible: true,
    isEditable: false,
  },
  {
    section: 'personal',
    label: 'Middle Name',
    fieldType: 'text',
    required: false,
  },
  {
    section: 'personal',
    label: 'Gender',
    fieldType: 'select',
    required: false,
  },
  {
    section: 'personal',
    label: 'Phone Number',
    fieldType: 'text',
    required: true,
  },
  {
    section: 'personal',
    label: 'Email Address',
    fieldType: 'text',
    required: true,
    isVisible: true,
    isEditable: false,
  },

  // 📎 Documents
  {
    section: 'documents',
    label: 'Resume/CV',
    fieldType: 'file',
    required: true,
  },
  {
    section: 'documents',
    label: 'Cover Letter',
    fieldType: 'file',
    required: false,
  },

  // 🎓 Education
  {
    section: 'education',
    label: 'Institution Name',
    fieldType: 'text',
    required: false,
  },
  {
    section: 'education',
    label: 'Course of Study',
    fieldType: 'text',
    required: false,
  },
  {
    section: 'education',
    label: 'Qualification',
    fieldType: 'text',
    required: false,
  },
  {
    section: 'education',
    label: 'Year of Graduation',
    fieldType: 'text',
    required: false,
  },

  // 💼 Experience
  {
    section: 'experience',
    label: 'Company Name',
    fieldType: 'text',
    required: false,
  },
  {
    section: 'experience',
    label: 'Job Title',
    fieldType: 'text',
    required: false,
  },
  {
    section: 'experience',
    label: 'Job Description',
    fieldType: 'textarea',
    required: false,
  },
  {
    section: 'experience',
    label: 'Start Date',
    fieldType: 'date',
    required: false,
  },
  {
    section: 'experience',
    label: 'End Date',
    fieldType: 'date',
    required: false,
  },

  // Custom
  { section: 'custom', label: 'Skills', fieldType: 'text', required: false },
];
