import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  employeeChecklistStatus,
  employeeLifecycleTokens,
  employeeOnboarding,
  onboardingTemplateChecklists,
} from '../schema';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import {
  employeeDocuments,
  employeeFinancials,
  employeeProfiles,
  employees,
} from 'src/drizzle/schema';
import { desc, eq, sql, and, ne } from 'drizzle-orm';
import { EmployeeOnboardingInputDto } from './dto/employee-onboarding-input.dto';
import { AwsService } from 'src/common/aws/aws.service';

type Tag = 'profile' | 'finance' | 'uploads' | 'other';

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly config: ConfigService,
    private readonly aws: AwsService,
  ) {}

  private generateToken(payload: any): string {
    const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
    return jwt.sign(payload, jwtSecret, {
      expiresIn: '5d', // Set token to expire in 5 days
    });
  }

  async assignOnboardingTemplate(
    employeeId: string,
    templateId: string,
    companyId: string,
    trx?: typeof this.db,
  ) {
    const db = trx ?? this.db; // use caller’s trx if provided
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const token = this.generateToken({ employeeId });

    await db.transaction(async (tx) => {
      /* 1️⃣  create onboarding row */
      await tx.insert(employeeOnboarding).values({
        employeeId,
        templateId,
        status: 'pending',
        startedAt: now,
        companyId,
      });

      /* 2️⃣  create lifecycle token */
      await tx.insert(employeeLifecycleTokens).values({
        employeeId,
        token,
        type: 'onboarding',
        expiresAt,
      });

      /* 3️⃣  pre-populate checklist status rows */
      const checklist = await tx
        .select({
          id: onboardingTemplateChecklists.id,
          dueAfter: onboardingTemplateChecklists.dueDaysAfterStart,
        })
        .from(onboardingTemplateChecklists)
        .where(eq(onboardingTemplateChecklists.templateId, templateId));

      if (checklist.length) {
        const statusRows = checklist.map((c) => ({
          employeeId,
          checklistId: c.id,
          status: 'pending' as const,
        }));

        await tx.insert(employeeChecklistStatus).values(statusRows);
      }

      //* 4️⃣  create offer letter for the
    });
  }

  async getEmployeesInOnboarding(companyId: string) {
    // 1️⃣ Fetch employees in onboarding
    const onboardingData = await this.db
      .select({
        employeeId: employees.id,
        employeeName:
          sql`${employees.firstName} || ' ' || ${employees.lastName}`.as(
            'employeeName',
          ),
        email: employees.email,
        templateId: employeeOnboarding.templateId,
        status: employeeOnboarding.status,
        startedAt: employeeOnboarding.startedAt,
      })
      .from(employeeOnboarding)
      .innerJoin(employees, eq(employees.id, employeeOnboarding.employeeId))
      .where(eq(employeeOnboarding.companyId, companyId))
      .orderBy(desc(employeeOnboarding.startedAt))
      .execute();

    // 2️⃣ For each employee, fetch checklist items + status
    const withChecklist = await Promise.all(
      onboardingData.map(async (entry) => {
        const checklistItems = await this.db
          .select({
            id: onboardingTemplateChecklists.id,
            title: onboardingTemplateChecklists.title,
            assignee: onboardingTemplateChecklists.assignee,
            order: onboardingTemplateChecklists.order,
            dueDaysAfterStart: onboardingTemplateChecklists.dueDaysAfterStart,
            status: employeeChecklistStatus.status,
            completedAt: employeeChecklistStatus.completedAt,
          })
          .from(onboardingTemplateChecklists)
          .leftJoin(
            employeeChecklistStatus,
            and(
              eq(
                employeeChecklistStatus.checklistId,
                onboardingTemplateChecklists.id,
              ),
              eq(employeeChecklistStatus.employeeId, entry.employeeId),
            ),
          )
          .where(eq(onboardingTemplateChecklists.templateId, entry.templateId))
          .orderBy(onboardingTemplateChecklists.order);

        return {
          ...entry,
          checklist: checklistItems,
        };
      }),
    );

    return withChecklist;
  }

  async getEmployeeOnboardingDetail(companyId: string, employeeId: string) {
    /* 1️⃣  locate the employee’s onboarding row */
    const row = await this.db
      .select({
        employeeId: employees.id,
        employeeName:
          sql`${employees.firstName} || ' ' || ${employees.lastName}`.as(
            'employeeName',
          ),
        email: employees.email,
        templateId: employeeOnboarding.templateId,
        status: employeeOnboarding.status,
        startedAt: employeeOnboarding.startedAt,
      })
      .from(employeeOnboarding)
      .innerJoin(employees, eq(employees.id, employeeOnboarding.employeeId))
      .where(
        and(
          eq(employeeOnboarding.companyId, companyId),
          eq(employeeOnboarding.employeeId, employeeId),
        ),
      )
      .limit(1)
      .execute()
      .then((r) => r[0]);

    if (!row)
      throw new BadRequestException(
        'Employee is not currently in an onboarding flow',
      );

    /* 2️⃣  fetch all checklist items for the employee’s template */
    const checklist = await this.db.query.onboardingTemplateChecklists.findMany(
      {
        where: (c, { eq }) => eq(c.templateId, row.templateId),
        orderBy: (c, { asc }) => asc(c.order),
      },
    );

    /* 3️⃣  fetch all fields for that template */
    const templateFieldsRaw =
      await this.db.query.onboardingTemplateFields.findMany({
        where: (f, { eq }) => eq(f.templateId, row.templateId),
      });

    // Map order: null → undefined for type compatibility
    const templateFields = templateFieldsRaw.map((f) => ({
      ...f,
      order: f.order === null ? undefined : f.order,
    }));

    /* 4️⃣  stitch fields into the checklist items using the static map */
    const checklistWithFields = checklist.map((item) => ({
      ...item,
      fields: this.resolveChecklistFields(item.title, templateFields),
    }));

    return { ...row, checklist: checklistWithFields };
  }

  async saveEmployeeOnboardingData(
    employeeId: string,
    payload: EmployeeOnboardingInputDto,
  ) {
    /* 0) Resolve template & (optionally) enforce required file */
    const onboardingRow = await this.db
      .select({
        templateId: employeeOnboarding.templateId,
        companyId: employeeOnboarding.companyId,
      })
      .from(employeeOnboarding)
      .where(eq(employeeOnboarding.employeeId, employeeId))
      .limit(1)
      .then((r) => r[0]);

    if (!onboardingRow) throw new BadRequestException('Onboarding not found');

    const { templateId } = onboardingRow;

    // If your system fields define idUpload as required on this template, enforce it:
    const idUploadRequired =
      await this.db.query.onboardingTemplateFields.findFirst({
        where: (f, { and, eq }) =>
          and(
            eq(f.templateId, templateId),
            eq(f.fieldKey, 'idUpload'),
            eq(f.required, true),
          ),
      });
    if (idUploadRequired && !payload.idUpload) {
      throw new BadRequestException(
        'ID upload is required for this onboarding.',
      );
    }

    /* 1) Split payload into buckets */
    const profileFields = {
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      maritalStatus: payload.maritalStatus,
      address: payload.address,
      country: payload.country,
      phone: payload.phone,
      emergencyName: payload.emergencyName,
      emergencyPhone: payload.emergencyPhone,
      employeeId,
    };

    const financialFields = {
      bankName: payload.bankName,
      bankAccountNumber: payload.bankAccountNumber,
      bankAccountName: payload.bankAccountName,
      bankBranch: payload.bankBranch,
      currency: payload.currency ?? 'NGN',
      tin: payload.tin,
      pensionPin: payload.pensionPin,
      nhfNumber: payload.nhfNumber,
      employeeId,
    };

    /* 2) Upsert profile */
    await this.db.insert(employeeProfiles).values(profileFields).execute();

    /* 3) Upsert financials */
    await this.db.insert(employeeFinancials).values(financialFields).execute();

    /* 4) Optional attachment (image or PDF) */
    if (payload.idUpload) {
      const upload = payload.idUpload as unknown;

      // Fetch email once for S3 pathing
      const emp = await this.db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1)
        .then((r) => r[0]);
      if (!emp) throw new BadRequestException('Employee not found');
      const { email } = emp;

      let fileUrl: string | null = null;
      let fileName = `id-${employeeId}-${Date.now()}`;
      let docType: 'id_upload' | 'image_upload' = 'image_upload';

      // CASE A: string
      if (typeof upload === 'string') {
        if (upload.startsWith('data:')) {
          // Validate data URL
          const commaIdx = upload.indexOf(',');
          if (commaIdx === -1) {
            throw new BadRequestException('Invalid data URL for idUpload.');
          }
          const meta = upload.slice(5, commaIdx); // after "data:"
          const base64Data = upload.slice(commaIdx + 1);

          const isPdf = /application\/pdf/i.test(meta);
          const isPng = /image\/png/i.test(meta);
          const isJpg = /image\/jpe?g/i.test(meta);

          const ext = isPdf ? 'pdf' : isPng ? 'png' : isJpg ? 'jpg' : 'bin';
          fileName = `${fileName}.${ext}`;
          docType = isPdf ? 'id_upload' : 'image_upload';

          if (isPdf) {
            const pdfBuffer = Buffer.from(base64Data, 'base64');
            fileUrl = await this.aws.uploadPdfToS3(email, fileName, pdfBuffer);
          } else {
            // Your helper expects full data URL; pass `upload`
            fileUrl = await this.aws.uploadImageToS3(email, fileName, upload);
          }
        } else if (/^https?:\/\//i.test(upload)) {
          // Already uploaded somewhere — persist reference only
          fileUrl = upload;
          // try to infer ext for docType (optional)
          if (upload.endsWith('.pdf')) docType = 'id_upload';
        } else {
          // Treat as an S3 key you already have (optional branch)
          // Implement a helper to turn keys to signed/public URLs if you want
          fileUrl = upload;
        }
      }
      // CASE B: file-like object { buffer, mimetype } — if your client ever sends this
      else if (
        upload &&
        typeof upload === 'object' &&
        'buffer' in (upload as any)
      ) {
        const u = upload as { buffer: Buffer; mimetype?: string };
        const isPdf = /pdf/i.test(u.mimetype || '');
        const ext = isPdf ? 'pdf' : 'bin';
        fileName = `${fileName}.${ext}`;
        docType = isPdf ? 'id_upload' : 'image_upload';
        fileUrl = await this.aws.uploadPdfToS3(email, fileName, u.buffer);
      }

      if (fileUrl) {
        await this.db
          .insert(employeeDocuments)
          .values({
            employeeId,
            type: docType,
            fileName,
            fileUrl,
          })
          .execute();
      }
      // If fileUrl is null, we silently skip; alternatively, throw to signal bad input
    }

    /* 5) Update checklist progress */
    await this.upsertChecklistProgress(employeeId, templateId, payload);

    /* 6) Auto-close onboarding if nothing left */
    const outstanding = await this.db
      .select({ cnt: sql<number>`count(*)` })
      .from(employeeChecklistStatus)
      .where(
        and(
          eq(employeeChecklistStatus.employeeId, employeeId),
          ne(employeeChecklistStatus.status, 'completed'),
        ),
      )
      .then((r) => r[0].cnt);

    if (outstanding === 0) {
      await this.db
        .update(employeeOnboarding)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(employeeOnboarding.employeeId, employeeId))
        .execute();
    }

    return { success: true };
  }

  async upsertChecklistProgress(
    employeeId: string,
    templateId: string,
    payload: EmployeeOnboardingInputDto,
  ) {
    // ① Pull checklist & fields once
    const [templateChecklist, templateFields] = await Promise.all([
      this.db.query.onboardingTemplateChecklists.findMany({
        where: (c, { eq }) => eq(c.templateId, templateId),
      }),
      this.db.query.onboardingTemplateFields.findMany({
        where: (f, { eq }) => eq(f.templateId, templateId),
      }),
    ]);

    // index fields by tag for robust fallback
    const keysByTag: Record<string, string[]> = {};
    for (const f of templateFields) {
      if (!f.tag) continue;
      (keysByTag[f.tag] ??= []).push(f.fieldKey);
    }

    const now = new Date();
    let anyCompleted = false;

    for (const item of templateChecklist) {
      // Prefer your static map; fallback to tag inference
      const fromMap = this.checklistFieldMap?.[item.title] ?? [];
      const tag = this.inferTagFromTitle(item.title);
      const inferred = tag ? (keysByTag[tag] ?? []) : [];
      const fieldKeys = fromMap.length ? fromMap : inferred;

      const satisfied =
        fieldKeys.length > 0 &&
        fieldKeys.every((k) => {
          if (k === 'idUpload') return !!payload.idUpload;
          const v = (payload as any)[k];
          return v !== undefined && v !== null && String(v).trim() !== '';
        });

      // Ensure there is at least a pending row (optional but nice)
      await this.db
        .insert(employeeChecklistStatus)
        .values({
          employeeId,
          checklistId: item.id,
          status: 'pending',
        })
        .execute();

      if (!satisfied) continue;

      // UPSERT to completed
      await this.db
        .insert(employeeChecklistStatus)
        .values({
          employeeId,
          checklistId: item.id,
          status: 'completed',
          completedAt: now,
        })
        .execute();

      anyCompleted = true;
    }

    // Optionally set employee active once they’ve completed at least one item
    if (anyCompleted) {
      await this.db
        .update(employees)
        .set({ employmentStatus: 'active' })
        .where(eq(employees.id, employeeId))
        .execute();
    }

    // ② Compute remaining correctly (LEFT JOIN so missing rows count as incomplete)
    const [{ remaining }] = await this.db
      .select({ remaining: sql<number>`count(*)` })
      .from(onboardingTemplateChecklists)
      .leftJoin(
        employeeChecklistStatus,
        and(
          eq(
            employeeChecklistStatus.checklistId,
            onboardingTemplateChecklists.id,
          ),
          eq(employeeChecklistStatus.employeeId, employeeId),
        ),
      )
      .where(
        and(
          eq(onboardingTemplateChecklists.templateId, templateId),
          // status is null OR not completed
          sql`(${employeeChecklistStatus.status} IS NULL OR ${employeeChecklistStatus.status} <> 'completed')`,
        ),
      )
      .execute();

    if (remaining === 0) {
      await this.db
        .update(employeeOnboarding)
        .set({ status: 'completed', completedAt: now })
        .where(
          and(
            eq(employeeOnboarding.employeeId, employeeId),
            eq(employeeOnboarding.templateId, templateId),
          ),
        )
        .execute();
    }
  }

  async updateChecklistStatus(
    employeeId: string,
    checklistId: string,
    status: 'pending' | 'completed',
  ) {
    const now = new Date();

    return this.db.transaction(async (tx) => {
      /* ── 1. Update / reset completedAt on the chosen item ─────────────── */
      const [updated] = await tx
        .update(employeeChecklistStatus)
        .set({
          status,
          completedAt: status === 'completed' ? now : null,
        })
        .where(
          and(
            eq(employeeChecklistStatus.employeeId, employeeId),
            eq(employeeChecklistStatus.checklistId, checklistId),
          ),
        )
        .returning();

      /* ── 2. Count any remaining non-completed items for this employee ─── */
      const [{ remaining }] = await tx
        .select({ remaining: sql<number>`count(*)` })
        .from(employeeChecklistStatus)
        .where(
          and(
            eq(employeeChecklistStatus.employeeId, employeeId),
            ne(employeeChecklistStatus.status, 'completed'),
          ),
        )
        .execute();

      console.log(remaining);

      /* ── 3. If none remain, mark onboarding as completed ──────────────── */
      if (Number(remaining) === 0) {
        console.log(
          `All checklist items completed for employee ${employeeId}. Marking onboarding as completed.`,
        );
        await tx
          .update(employeeOnboarding)
          .set({
            status: 'completed',
            completedAt: now,
          })
          .where(eq(employeeOnboarding.employeeId, employeeId))
          .execute();
      }
      return updated; // same shape you returned before
    });
  }

  // utils/onboardingFieldResolver.ts
  private norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

  private exactTitleMap: Record<string, string[]> = {
    // normalized keys
    'fill personal details': [
      'dateOfBirth',
      'gender',
      'maritalStatus',
      'address',
      'country',
      'phone',
      'emergencyName',
      'emergencyPhone',
    ],
    'fill basic personal details': [
      'dateOfBirth',
      'gender',
      'maritalStatus',
      'address',
      'country',
      'phone',
    ],
    'complete basic info': ['dateOfBirth', 'gender', 'phone'],
    'fill out personal details': [
      'dateOfBirth',
      'gender',
      'phone',
      'address',
      'country',
    ],
    'fill personal info': ['dateOfBirth', 'gender', 'phone', 'country'],
    'complete personal details': [
      'dateOfBirth',
      'gender',
      'phone',
      'address',
      'country',
      'emergencyName',
    ],

    'add bank and tax info': [
      'bankName',
      'bankAccountNumber',
      'bankAccountName',
      'bankBranch',
      'currency',
      'tin',
      'pensionPin',
      'nhfNumber',
    ],
    'submit tax and banking info': [
      'bankName',
      'bankAccountNumber',
      'bankAccountName',
      'bankBranch',
      'tin',
      'pensionPin',
      'nhfNumber',
    ],
    'complete tax and payment setup': [
      'tin',
      'bankAccountNumber',
      'bankAccountName',
      'currency',
    ],

    'upload valid id': ['idUpload'],
    'upload student id': ['idUpload'],
    'upload signed contract': ['idUpload'],
    'submit medical certifications': ['idUpload'],

    'add dependents (optional)': [],
    'upload certifications (if any)': [],
    'submit social media handles (optional)': [],
  };

  TITLE_RULES: Array<{ test: (t: string) => boolean; tag: Tag }> = [
    {
      test: (t) => /(personal|profile|basic info|details)/i.test(t),
      tag: 'profile',
    },
    {
      test: (t) => /(bank|tax|payment|finance|pension|nhf)/i.test(t),
      tag: 'finance',
    },
    {
      test: (t) => /(upload|id|contract|certificate|certification)/i.test(t),
      tag: 'uploads',
    },
  ];

  private inferTagFromTitle(title: string): Tag | null {
    const hit = this.TITLE_RULES.find((r) => r.test(title));
    return hit?.tag ?? null;
  }

  private resolveChecklistFields(
    title: string,
    templateFields: Array<{ fieldKey: string; tag?: string; order?: number }>,
  ) {
    // 1) exact (normalized) title
    const exactKeys = this.exactTitleMap[this.norm(title)];
    if (exactKeys) {
      return exactKeys
        .map((k) => templateFields.find((f) => f.fieldKey === k))
        .filter(Boolean)
        .sort((a, b) => (a!.order ?? 0) - (b!.order ?? 0));
    }

    // 2) tag keyword inference
    const tag = this.inferTagFromTitle(title);
    if (tag) {
      if (tag === 'uploads') {
        const f = templateFields.find((f) => f.fieldKey === 'idUpload');
        return f ? [f] : [];
      }
      return templateFields
        .filter((f) => (f.tag as Tag | undefined) === tag)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    // 3) nothing matched
    return [];
  }

  private checklistFieldMap: Record<string, string[]> = {
    'Fill Personal Details': [
      'dateOfBirth',
      'gender',
      'maritalStatus',
      'address',
      'country',
      'phone',
      'emergencyName',
      'emergencyPhone',
    ],
    'Fill Basic Personal Details': [
      'dateOfBirth',
      'gender',
      'maritalStatus',
      'address',
      'country',
      'phone',
    ],
    'Complete Basic Info': ['dateOfBirth', 'gender', 'phone'],
    'Fill Out Personal Details': [
      'dateOfBirth',
      'gender',
      'phone',
      'address',
      'country',
    ],
    'Fill Personal Info': ['dateOfBirth', 'gender', 'phone', 'country'],
    'Complete Personal Details': [
      'dateOfBirth',
      'gender',
      'phone',
      'address',
      'country',
      'emergencyName',
    ],

    'Add Bank and Tax Info': [
      'bankName',
      'bankAccountNumber',
      'bankAccountName',
      'bankBranch',
      'currency',
      'tin',
      'pensionPin',
      'nhfNumber',
    ],
    'Submit Tax and Banking Info': [
      'bankName',
      'bankAccountNumber',
      'bankAccountName',
      'bankBranch',
      'tin',
      'pensionPin',
      'nhfNumber',
    ],
    'Complete Tax and Payment Setup': [
      'tin',
      'bankAccountNumber',
      'bankAccountName',
      'currency',
    ],

    'Upload Valid ID': ['idUpload'],
    'Upload Student ID': ['idUpload'],
    'Upload Signed Contract': ['idUpload'],
    'Submit Medical Certifications': ['idUpload'],

    // Optional steps that may not have fields:
    'Add Dependents (Optional)': [],
    'Upload Certifications (If Any)': [],
    'Submit Social Media Handles (Optional)': [],
  };
}
