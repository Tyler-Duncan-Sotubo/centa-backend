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

@Injectable()
export class ApplicationFormService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

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
  }

  async getDefaultFields() {
    const fields = await this.db.select().from(application_field_definitions);
    if (fields.length === 0) {
      throw new NotFoundException('No default fields found');
    }

    return fields;
  }

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

      // Optionally clear existing fields/questions here if you want a full overwrite
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

      console.log('Created new application form config:', formId);
    }

    // Add additional fields/questions if provided
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

    return { formId };
  }

  async getFormPreview(jobId: string) {
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
  {
    section: 'custom',
    label: 'Skills',
    fieldType: 'text',
    required: false,
  },
];
