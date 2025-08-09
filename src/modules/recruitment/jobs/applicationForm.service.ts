import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ApplicationFormService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(ApplicationFormService.name);
  }

  // ---------- cache keys ----------
  private defaultDefsKey() {
    return `appform:defaults`;
  }
  private formConfigKey(jobId: string) {
    return `appform:job:${jobId}:config`;
  }
  private formPreviewKey(jobId: string) {
    return `appform:job:${jobId}:preview`;
  }
  private fieldsKey(jobId: string) {
    return `appform:job:${jobId}:fields`;
  }
  private questionsKey(jobId: string) {
    return `appform:job:${jobId}:questions`;
  }
  private async burst(opts: { jobId?: string; defaults?: boolean }) {
    const jobs: Promise<any>[] = [];
    if (opts.defaults) jobs.push(this.cache.del(this.defaultDefsKey()));
    if (opts.jobId) {
      jobs.push(this.cache.del(this.formConfigKey(opts.jobId)));
      jobs.push(this.cache.del(this.formPreviewKey(opts.jobId)));
      jobs.push(this.cache.del(this.fieldsKey(opts.jobId)));
      jobs.push(this.cache.del(this.questionsKey(opts.jobId)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:application-form');
  }

  // ---------- seed & defaults ----------
  async seedDefaultFields() {
    this.logger.info({}, 'appform:seedDefaults:start');

    const count = (
      await this.db.select().from(application_field_definitions).execute()
    ).length;
    if (count > 0) {
      this.logger.warn({ count }, 'appform:seedDefaults:already-exists');
      throw new BadRequestException('Default fields already exist');
    }

    await this.db
      .insert(application_field_definitions)
      .values(
        defaultFields.map((field, index) => ({
          section: field.section,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          isVisible: field.isVisible ?? true,
          isEditable: field.isEditable ?? true,
          order: index + 1,
        })),
      )
      .execute();

    await this.burst({ defaults: true });
    this.logger.info(
      { inserted: defaultFields.length },
      'appform:seedDefaults:done',
    );
  }

  async getDefaultFields() {
    const key = this.defaultDefsKey();
    this.logger.debug({ key }, 'appform:getDefaults:cache:get');

    const fields = await this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(application_field_definitions)
        .execute();
      return rows;
    });

    if (!fields || fields.length === 0) {
      this.logger.warn({}, 'appform:getDefaults:not-found');
      throw new NotFoundException('No default fields found');
    }

    return fields;
  }

  // ---------- upsert form (config + optional extras) ----------
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
    this.logger.info(
      { jobId, companyId: user.companyId, style: config?.style },
      'appform:upsert:start',
    );

    const existing = await this.db
      .select()
      .from(application_form_configs)
      .where(eq(application_form_configs.jobId, jobId))
      .execute();

    let formId: string;

    if (existing.length > 0) {
      formId = existing[0].id;
      await this.db
        .update(application_form_configs)
        .set({
          style: config.style,
          includeReferences: config.includeReferences ?? false,
        })
        .where(eq(application_form_configs.id, formId))
        .execute();
    } else {
      const [form] = await this.db
        .insert(application_form_configs)
        .values({
          jobId,
          style: config.style,
          includeReferences: config.includeReferences ?? false,
        })
        .returning()
        .execute();
      formId = form.id;
      this.logger.debug({ jobId, formId }, 'appform:upsert:created');
    }

    // Add additional fields/questions if provided
    if (config.customFields?.length) {
      await this.db
        .insert(application_form_fields)
        .values(
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
        )
        .execute();
    }

    if (config.customQuestions?.length) {
      await this.db
        .insert(application_form_questions)
        .values(
          config.customQuestions.map((q, i) => ({
            companyId: user.companyId,
            formId,
            question: q.question,
            type: q.type,
            required: q.required ?? true,
            order: q.order ?? i + 1,
          })),
        )
        .execute();
    }

    await this.burst({ jobId });
    this.logger.info({ jobId, formId }, 'appform:upsert:done');
    return { formId };
  }

  // ---------- preview (cached) ----------
  async getFormPreview(jobId: string) {
    const key = this.formPreviewKey(jobId);
    this.logger.debug({ key, jobId }, 'appform:preview:cache:get');

    const payload = await this.cache.getOrSetCache(key, async () => {
      const [config] = await this.db
        .select()
        .from(application_form_configs)
        .where(eq(application_form_configs.jobId, jobId))
        .execute();

      if (!config) return null;

      const fields = await this.db
        .select()
        .from(application_form_fields)
        .where(eq(application_form_fields.formId, config.id))
        .orderBy(asc(application_form_fields.order))
        .execute();

      const questions = await this.db
        .select()
        .from(application_form_questions)
        .where(eq(application_form_questions.formId, config.id))
        .orderBy(asc(application_form_questions.order))
        .execute();

      return {
        style: config.style,
        includeReferences: config.includeReferences,
        fields,
        questions,
      };
    });

    if (!payload) {
      this.logger.warn({ jobId }, 'appform:preview:not-configured');
      throw new NotFoundException(
        'Application form not configured for this job',
      );
    }

    return payload;
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

  // 🧩 Custom
  { section: 'custom', label: 'Skills', fieldType: 'text', required: false },
];
