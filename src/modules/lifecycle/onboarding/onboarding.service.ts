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
    const templateFields =
      await this.db.query.onboardingTemplateFields.findMany({
        where: (f, { eq }) => eq(f.templateId, row.templateId),
      });

    /* 4️⃣  stitch fields into the checklist items using the static map */
    const checklistWithFields = checklist.map((item) => ({
      ...item,
      fields: (this.checklistFieldMap[item.title] || [])
        .map((key) => templateFields.find((f) => f.fieldKey === key))
        .filter(Boolean),
    }));

    return { ...row, checklist: checklistWithFields };
  }

  async saveEmployeeOnboardingData(
    employeeId: string,
    payload: EmployeeOnboardingInputDto,
  ) {
    /* ───── 1. Split payload into logical buckets ───────────────────────── */
    const profileFields = {
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      maritalStatus: payload.maritalStatus,
      address: payload.address,
      country: payload.country,
      phone: payload.phone,
      emergencyName: payload.emergencyName,
      emergencyPhone: payload.emergencyPhone,
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
    };

    /* ───── 2. Upsert profile ───────────────────────────────────────────── */
    await this.db
      .insert(employeeProfiles)
      .values({ ...profileFields, employeeId })
      .execute();

    /* ───── 3. Upsert financials ────────────────────────────────────────── */
    await this.db
      .insert(employeeFinancials)
      .values({ ...financialFields, employeeId })
      .execute();

    /* ───── 4. Handle attachment (image or PDF) ─────────────────────────── */
    if (payload.idUpload) {
      // 4-a. Parse the Base64 string: "data:<mime>;base64,<encoded>"
      const [meta, base64Data] = payload.idUpload.split(',');
      const isPdf = meta.includes('application/pdf');
      const fileExt = isPdf ? 'pdf' : meta.includes('png') ? 'png' : 'jpg';
      const fileName = `id-${employeeId}-${Date.now()}.${fileExt}`;

      // (Assuming you can fetch the employee email once—needed by your helpers)
      const { email } = await this.db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1)
        .then((r) => r[0]);

      let fileUrl: string;

      if (isPdf) {
        // Convert raw Base64 → Buffer (PDF helper expects Buffer)
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        fileUrl = await this.aws.uploadPdfToS3(email, fileName, pdfBuffer);
      } else {
        // Image helper already expects the full data URL
        fileUrl = await this.aws.uploadImageToS3(
          email,
          fileName,
          payload.idUpload,
        );
      }

      // 4-b. Persist reference to DB
      await this.db.insert(employeeDocuments).values({
        employeeId,
        type: isPdf ? 'id_upload' : 'image_upload',
        fileName,
        fileUrl,
      });
    }
    /* ───── 5. Update checklist progress ───────────────────── */

    const { templateId } = await this.db
      .select({ templateId: employeeOnboarding.templateId })
      .from(employeeOnboarding)
      .where(eq(employeeOnboarding.employeeId, employeeId))
      .limit(1)
      .then((r) => r[0]);

    // Re-use the helper we sketched earlier
    await this.upsertChecklistProgress(employeeId, templateId, payload);

    /* ───── 6. Auto-close onboarding if nothing left ───────── */

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
        .where(eq(employeeOnboarding.employeeId, employeeId));
    }

    return { success: true };
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

  async upsertChecklistProgress(
    employeeId: string,
    templateId: string,
    payload: EmployeeOnboardingInputDto,
  ) {
    /* ① Pull every checklist row for the template */
    const templateChecklist =
      await this.db.query.onboardingTemplateChecklists.findMany({
        where: (c, { eq }) => eq(c.templateId, templateId),
      });

    /* ② Determine which items are satisfied */
    const now = new Date();
    for (const item of templateChecklist) {
      const fieldKeys = this.checklistFieldMap[item.title] ?? [];

      /* 👉 NEW: require at least one key */
      const satisfied =
        fieldKeys.length > 0 && // ← guard
        fieldKeys.every((k) =>
          k === 'idUpload'
            ? Boolean(payload.idUpload)
            : payload[k as keyof EmployeeOnboardingInputDto] != null &&
              payload[k as keyof EmployeeOnboardingInputDto] !== '',
        );

      if (!satisfied) continue; // nothing to update

      /* ③ Check if the employee already has a status row for this item */
      if (satisfied) {
        /* UPSERT progress row */
        await this.db
          .update(employeeChecklistStatus)
          .set({
            status: 'completed',
            completedAt: now,
          })
          .where(
            and(
              eq(employeeChecklistStatus.employeeId, employeeId),
              eq(employeeChecklistStatus.checklistId, item.id),
            ),
          );

        await this.db
          .update(employees)
          .set({
            employmentStatus: 'active',
          })
          .where(eq(employees.id, employeeId));
      }

      const [{ remaining }] = await this.db
        .select({ remaining: sql<number>`count(*)` })
        .from(employeeChecklistStatus)
        .innerJoin(
          onboardingTemplateChecklists,
          and(
            eq(
              onboardingTemplateChecklists.id,
              employeeChecklistStatus.checklistId,
            ),
            eq(onboardingTemplateChecklists.templateId, templateId),
          ),
        )
        .where(
          and(
            eq(employeeChecklistStatus.employeeId, employeeId),
            ne(employeeChecklistStatus.status, 'completed'),
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
          );
      }
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
}
