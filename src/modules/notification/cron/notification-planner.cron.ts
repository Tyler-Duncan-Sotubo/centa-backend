/* eslint-disable @typescript-eslint/no-unused-vars */
// src/modules/notification/cron/notification-planner.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { sql, and, eq } from 'drizzle-orm';
// goals / cycles / assessments tables you already have
import {
  performanceCycles,
  performanceReviewTemplates,
} from 'src/drizzle/schema';
import { NotificationEngineService } from '../notification-engine.service';
import { buildGoalSubject } from '../helpers/helper';

type DueBucket = 't30' | 't14' | 't7' | 't2' | 'today' | 'overdue';
type AssessmentType = 'self' | 'manager';

type ReminderBucket = {
  bucket: DueBucket;
  daysFromNow: number; // compared against CURRENT_DATE
  eventType: string;
};

type CycleRow = {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
};

type AssessmentRow = {
  assessmentId: string;
  employeeId: string;
  recipientUserId: string | null;
  toEmail: string;
  firstName: string;
  employeeName: string;
  reviewerName: string | null;
  cycleId: string;
  cycleName: string;
  dueDate: Date;
  type: AssessmentType;
};

@Injectable()
export class NotificationPlannerCron {
  private readonly logger = new Logger(NotificationPlannerCron.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly engine: NotificationEngineService,
  ) {}

  // ✅ runs daily 09:00 server time
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyPlanner() {
    this.logger.log({ op: 'notification.planner.start' });

    // ---- Get active companies (simple: distinct companyIds from cycles) ----
    const companies = await this.db
      .selectDistinct({ companyId: performanceCycles.companyId })
      .from(performanceCycles);

    for (const c of companies) {
      try {
        await this.planForCompany(c.companyId);
      } catch (e: any) {
        this.logger.error(
          {
            op: 'notification.planner.company.failed',
            companyId: c.companyId,
            msg: e?.message,
          },
          e?.stack,
        );
      }
    }

    this.logger.log({
      op: 'notification.planner.done',
      companies: companies.length,
    });
  }

  private async planForCompany(companyId: string) {
    // Goals reminders
    await this.planGoalReminders(companyId);

    // Appraisals / Assessments reminders (self-before-manager)
    await this.planAssessmentReminders(companyId);
  }

  // --------------------------------------------------------------------------
  // GOALS
  // --------------------------------------------------------------------------
  private async planGoalReminders(companyId: string) {
    // due buckets: 7d, 2d, today, overdue (add 14d if you want)
    const buckets: Array<{ bucket: DueBucket; daysFromNow: number }> = [
      { bucket: 't7', daysFromNow: 7 },
      { bucket: 't2', daysFromNow: 2 },
      { bucket: 'today', daysFromNow: 0 },
    ];

    for (const b of buckets) {
      const rows = await this.db.execute(sql`
        SELECT
          g.id AS "goalId",
          g.company_id AS "companyId",
          g.employee_id AS "employeeId",
          e.user_id AS "recipientUserId",
          e.email AS "toEmail",
          COALESCE(u.first_name, '') AS "firstName",
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS "employeeName",
          g.title AS "goalTitle",
          g.due_date AS "dueDate"
        FROM performance_goals g
        JOIN employees e ON e.id = g.employee_id
        JOIN users u ON u.id = e.user_id
        WHERE g.company_id = ${companyId}
          AND g.is_archived = false
          AND g.status IN ('active', 'incomplete') -- adjust to your statuses
          AND g.due_date = (CURRENT_DATE + ${b.daysFromNow} * INTERVAL '1 day')::date
      `);

      const list = rows.rows as any[];

      for (const r of list) {
        const eventType =
          b.bucket === 't7'
            ? 'goal_due_t7'
            : b.bucket === 't2'
              ? 'goal_due_t2'
              : 'goal_due_today';

        const dedupeKey = `notif:${companyId}:goal:${r.goalId}:${eventType}:${r.toEmail}`;
        const subject = buildGoalSubject(b.bucket);
        await this.engine.createAndEnqueue({
          companyId,
          channel: 'email',
          eventType,
          entityType: 'goal',
          entityId: r.goalId,
          recipientUserId: r.recipientUserId,
          recipientEmployeeId: r.employeeId,
          recipientEmail: r.toEmail,
          dedupeKey,
          jobName: 'sendNotificationEvent',
          payload: {
            toEmail: r.toEmail,
            firstName: r.firstName,
            employeeName: r.employeeName,
            title: r.goalTitle,
            dueDate: r.dueDate,
            subject,
            companyName: '', // optional, fill if you have companies table
            meta: {
              goalId: r.goalId,
              employeeId: r.employeeId,
              bucket: b.bucket,
            },
          },
        });
      }
    }

    // overdue every 3 days (simple)
    const overdue = await this.db.execute(sql`
      SELECT
        g.id AS "goalId",
        g.company_id AS "companyId",
        g.employee_id AS "employeeId",
        e.user_id AS "recipientUserId",
        e.email AS "toEmail",
        COALESCE(u.first_name, '') AS "firstName",
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS "employeeName",
        g.title AS "goalTitle",
        g.due_date AS "dueDate"
      FROM performance_goals g
      JOIN employees e ON e.id = g.employee_id
      JOIN users u ON u.id = e.user_id
      WHERE g.company_id = ${companyId}
        AND g.is_archived = false
        AND g.status IN ('active', 'incomplete')
        AND g.due_date < CURRENT_DATE
        AND ((CURRENT_DATE - g.due_date) % 3) = 0
    `);

    const overdueList = overdue.rows as any[];

    for (const r of overdueList) {
      const eventType = 'goal_overdue';
      const dedupeKey = `notif:${companyId}:goal:${r.goalId}:${eventType}:${r.toEmail}:d${new Date().toISOString().slice(0, 10)}`;

      await this.engine.createAndEnqueue({
        companyId,
        channel: 'email',
        eventType,
        entityType: 'goal',
        entityId: r.goalId,
        recipientUserId: r.recipientUserId,
        recipientEmployeeId: r.employeeId,
        recipientEmail: r.toEmail,
        dedupeKey,
        jobName: 'sendNotificationEvent',
        payload: {
          toEmail: r.toEmail,
          firstName: r.firstName,
          employeeName: r.employeeName,
          title: r.goalTitle,
          dueDate: r.dueDate,
          companyName: '',
          meta: {
            goalId: r.goalId,
            employeeId: r.employeeId,
            bucket: 'overdue',
          },
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // APPRAISALS / ASSESSMENTS (SELF BEFORE MANAGER)
  // --------------------------------------------------------------------------
  private async getDefaultTemplateIdOrThrow(
    companyId: string,
  ): Promise<string> {
    const [tpl] = await this.db
      .select({ id: performanceReviewTemplates.id })
      .from(performanceReviewTemplates)
      .where(
        and(
          eq(performanceReviewTemplates.companyId, companyId),
          eq(performanceReviewTemplates.isDefault, true),
        ),
      )
      .limit(1);

    if (!tpl?.id)
      throw new Error('No default performance review template set.');
    return tpl.id;
  }

  /**
   * Create missing self + manager assessments for the cycles being processed.
   * Uses ON CONFLICT DO NOTHING safety (requires unique constraint).
   */
  private async ensureAssessmentsExistForBuckets(
    companyId: string,
    buckets: Array<{
      bucket: DueBucket;
      daysFromNow: number;
      eventType: string;
    }>,
  ) {
    const templateId = await this.getDefaultTemplateIdOrThrow(companyId);

    for (const b of buckets) {
      // cycles matching the bucket
      const cycles = await this.db.execute(sql`
        SELECT c.id AS "cycleId"
        FROM performance_cycles c
        WHERE c.company_id = ${companyId}
          AND c.end_date = (CURRENT_DATE + ${b.daysFromNow} * INTERVAL '1 day')::date
      `);

      const cycleIds = (cycles.rows as any[]).map((r) => r.cycleId);
      if (!cycleIds.length) continue;

      // --- 1) SELF: create missing self assessments for employees
      // reviewerId = employee.user_id, revieweeId = employee.id
      await this.db.execute(sql`
        INSERT INTO performance_assessments
          (company_id, cycle_id, template_id, reviewer_id, reviewee_id, type, status, created_at)
        SELECT
          ${companyId}::uuid,
          c.id::uuid,
          ${templateId}::uuid,
          e.user_id::uuid,
          e.id::uuid,
          'self',
          'not_started',
          NOW()
        FROM performance_cycles c
        JOIN employees e ON e.company_id = c.company_id
        WHERE c.company_id = ${companyId}
          AND c.id = ANY(${sql.raw(`ARRAY[${cycleIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
          AND e.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM performance_assessments a
            WHERE a.company_id = c.company_id
              AND a.cycle_id = c.id
              AND a.reviewee_id = e.id
              AND a.type = 'self'
          )
      `);

      // --- 2) MANAGER: create missing manager assessments for employees with a manager
      // reviewerId = manager.user_id, revieweeId = employee.id
      await this.db.execute(sql`
        INSERT INTO performance_assessments
          (company_id, cycle_id, template_id, reviewer_id, reviewee_id, type, status, created_at)
        SELECT
          ${companyId}::uuid,
          c.id::uuid,
          ${templateId}::uuid,
          mu.id::uuid,
          e.id::uuid,
          'manager',
          'not_started',
          NOW()
        FROM performance_cycles c
        JOIN employees e ON e.company_id = c.company_id
        JOIN employees me ON me.id = e.manager_id
        JOIN users mu ON mu.id = me.user_id
        WHERE c.company_id = ${companyId}
          AND c.id = ANY(${sql.raw(`ARRAY[${cycleIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
          AND e.manager_id IS NOT NULL
          AND me.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM performance_assessments a
            WHERE a.company_id = c.company_id
              AND a.cycle_id = c.id
              AND a.reviewee_id = e.id
              AND a.type = 'manager'
          )
      `);
    }
  }

  // =========================================================
  // PUBLIC ENTRYPOINT
  // =========================================================
  public async planAssessmentReminders(companyId: string) {
    // 1) pull relevant cycles (ends soon + recent past for safety)
    const cycles = await this.getRelevantCycles(companyId);

    // 2) ensure assessments exist (your existing implementation can be called here)
    await this.ensureAssessmentsExistForCycles(companyId, cycles);

    // 3) plan buckets per cycle length, but only execute buckets that are “today”
    for (const cycle of cycles) {
      const bucketsToday = this.computeBucketsThatRunToday(cycle);

      if (bucketsToday.length === 0) continue;

      // ✅ ensure assessments exist for these buckets if you need bucket-based ensure
      // await this.ensureAssessmentsExistForBuckets(companyId, bucketsToday);

      for (const b of bucketsToday) {
        // Self reminders (digest per recipient)
        const selfRows = await this.fetchSelfDueRows(
          companyId,
          cycle.id,
          b.daysFromNow,
        );
        await this.enqueueDigestNotifications(companyId, b, 'self', selfRows);

        // Manager reminders (digest per recipient) - only if self submitted
        const mgrRows = await this.fetchManagerDueRows(
          companyId,
          cycle.id,
          b.daysFromNow,
        );
        await this.enqueueDigestNotifications(companyId, b, 'manager', mgrRows);
      }
    }

    // 4) overdue reminders (daily digest; self + manager-with-self-submitted)
    const overdueRows = await this.fetchOverdueRows(companyId);
    await this.enqueueOverdueDigest(companyId, overdueRows);
  }

  // =========================================================
  // BUCKET LOGIC (LESS EMAIL + BASED ON CYCLE LENGTH)
  // =========================================================
  private computeBucketsThatRunToday(cycle: CycleRow): ReminderBucket[] {
    const start = new Date(cycle.start_date);
    const end = new Date(cycle.end_date);
    const cycleLenDays = Math.max(1, this.diffDaysUTC(start, end));

    const blueprint = this.bucketsForCycleLength(cycleLenDays);

    // Convert "days before due" into "days from now"
    const buckets: ReminderBucket[] = blueprint.map((p) => ({
      bucket: p.bucket,
      daysFromNow: this.daysFromNowForReminder(end, p.daysBeforeDue),
      eventType: p.eventType,
    }));

    // Only run reminders whose reminder date is today => daysFromNow == 0
    // (Because your SQL uses CURRENT_DATE + daysFromNow)
    return buckets.filter((b) => b.daysFromNow === 0);
  }

  private bucketsForCycleLength(cycleLengthDays: number): Array<{
    bucket: DueBucket;
    daysBeforeDue: number;
    eventType: string;
  }> {
    // ✅ Fewer emails for shorter cycles; more for longer cycles
    if (cycleLengthDays >= 90) {
      return [
        { bucket: 't30', daysBeforeDue: 30, eventType: 'assessment_t30' },
        { bucket: 't14', daysBeforeDue: 14, eventType: 'assessment_t14' },
        { bucket: 't7', daysBeforeDue: 7, eventType: 'assessment_t7' },
        { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
        {
          bucket: 'today',
          daysBeforeDue: 0,
          eventType: 'assessment_due_today',
        },
      ];
    }
    if (cycleLengthDays >= 45) {
      return [
        { bucket: 't14', daysBeforeDue: 14, eventType: 'assessment_t14' },
        { bucket: 't7', daysBeforeDue: 7, eventType: 'assessment_t7' },
        { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
        {
          bucket: 'today',
          daysBeforeDue: 0,
          eventType: 'assessment_due_today',
        },
      ];
    }
    if (cycleLengthDays >= 21) {
      return [
        { bucket: 't7', daysBeforeDue: 7, eventType: 'assessment_t7' },
        { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
        {
          bucket: 'today',
          daysBeforeDue: 0,
          eventType: 'assessment_due_today',
        },
      ];
    }
    if (cycleLengthDays >= 10) {
      return [
        { bucket: 't2', daysBeforeDue: 2, eventType: 'assessment_t2' },
        {
          bucket: 'today',
          daysBeforeDue: 0,
          eventType: 'assessment_due_today',
        },
      ];
    }
    return [
      { bucket: 'today', daysBeforeDue: 0, eventType: 'assessment_due_today' },
    ];
  }

  private daysFromNowForReminder(dueDate: Date, daysBeforeDue: number): number {
    const reminderDate = this.utcDateOnly(dueDate);
    reminderDate.setUTCDate(reminderDate.getUTCDate() - daysBeforeDue);

    const today = this.utcDateOnly(new Date());
    return this.diffDaysUTC(today, reminderDate);
  }

  private diffDaysUTC(a: Date, b: Date): number {
    const ua = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const ub = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((ub - ua) / (24 * 60 * 60 * 1000));
  }

  private utcDateOnly(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  // =========================================================
  // FETCH CYCLES
  // =========================================================
  private async getRelevantCycles(companyId: string): Promise<CycleRow[]> {
    const res = await this.db.execute(sql`
      SELECT id, name, start_date, end_date
      FROM performance_cycles
      WHERE company_id = ${companyId}
        AND end_date >= (CURRENT_DATE - INTERVAL '365 days')::date
        AND end_date <= (CURRENT_DATE + INTERVAL '90 days')::date
      ORDER BY end_date DESC
    `);
    return (res.rows ?? []) as CycleRow[];
  }

  // =========================================================
  // ENSURE ASSESSMENTS EXIST
  // =========================================================
  private async ensureAssessmentsExistForCycles(
    companyId: string,
    cycles: CycleRow[],
  ) {
    // Call your existing creation logic.
    // Example if you have ensureAssessmentsExistForBuckets, you can call it per cycle with computed buckets.
    // Leaving as a stub to avoid inventing your schema/logic.
    return;
  }

  // =========================================================
  // QUERY ROWS (SELF / MANAGER / OVERDUE)
  // =========================================================
  private async fetchSelfDueRows(
    companyId: string,
    cycleId: string,
    daysFromNow: number,
  ): Promise<AssessmentRow[]> {
    const res = await this.db.execute(sql`
      SELECT
        a.id AS "assessmentId",
        a.reviewee_id AS "employeeId",
        e.user_id AS "recipientUserId",
        e.email AS "toEmail",
        COALESCE(u.first_name, '') AS "firstName",
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS "employeeName",
        NULL::text AS "reviewerName",
        c.id AS "cycleId",
        c.name AS "cycleName",
        c.end_date AS "dueDate",
        'self'::text AS "type"
      FROM performance_assessments a
      JOIN performance_cycles c ON c.id = a.cycle_id
      JOIN employees e ON e.id = a.reviewee_id
      JOIN users u ON u.id = e.user_id
      WHERE a.company_id = ${companyId}
        AND a.cycle_id = ${cycleId}
        AND a.type = 'self'
        AND a.status <> 'submitted'
        AND c.end_date = (CURRENT_DATE + ${daysFromNow} * INTERVAL '1 day')::date
    `);

    return (res.rows ?? []) as AssessmentRow[];
  }

  private async fetchManagerDueRows(
    companyId: string,
    cycleId: string,
    daysFromNow: number,
  ): Promise<AssessmentRow[]> {
    const res = await this.db.execute(sql`
      SELECT
        m.id AS "assessmentId",
        m.reviewee_id AS "employeeId",
        mu.id AS "recipientUserId",
        mu.email AS "toEmail",
        COALESCE(mu.first_name, '') AS "firstName",
        CONCAT(COALESCE(eu.first_name, ''), ' ', COALESCE(eu.last_name, '')) AS "employeeName",
        CONCAT(COALESCE(mu.first_name, ''), ' ', COALESCE(mu.last_name, '')) AS "reviewerName",
        c.id AS "cycleId",
        c.name AS "cycleName",
        c.end_date AS "dueDate",
        'manager'::text AS "type"
      FROM performance_assessments m
      JOIN performance_cycles c ON c.id = m.cycle_id
      JOIN employees e ON e.id = m.reviewee_id
      JOIN users eu ON eu.id = e.user_id
      JOIN employees me ON me.id = e.manager_id
      JOIN users mu ON mu.id = me.user_id
      WHERE m.company_id = ${companyId}
        AND m.cycle_id = ${cycleId}
        AND m.type = 'manager'
        AND m.status <> 'submitted'
        AND c.end_date = (CURRENT_DATE + ${daysFromNow} * INTERVAL '1 day')::date
        AND EXISTS (
          SELECT 1
          FROM performance_assessments s
          WHERE s.company_id = m.company_id
            AND s.cycle_id = m.cycle_id
            AND s.reviewee_id = m.reviewee_id
            AND s.type = 'self'
            AND s.status = 'submitted'
        )
    `);

    return (res.rows ?? []) as AssessmentRow[];
  }

  private async fetchOverdueRows(companyId: string): Promise<AssessmentRow[]> {
    const res = await this.db.execute(sql`
      SELECT
        a.id AS "assessmentId",
        a.type AS "type",
        a.reviewee_id AS "employeeId",
        c.id AS "cycleId",
        c.name AS "cycleName",
        c.end_date AS "dueDate",
        CASE
          WHEN a.type = 'self' THEN eu.email
          ELSE mu.email
        END AS "toEmail",
        CASE
          WHEN a.type = 'self' THEN COALESCE(eu.first_name, '')
          ELSE COALESCE(mu.first_name, '')
        END AS "firstName",
        CONCAT(COALESCE(eu.first_name, ''), ' ', COALESCE(eu.last_name, '')) AS "employeeName",
        CASE
          WHEN a.type = 'self' THEN NULL
          ELSE CONCAT(COALESCE(mu.first_name, ''), ' ', COALESCE(mu.last_name, ''))
        END AS "reviewerName",
        CASE
          WHEN a.type = 'self' THEN e.user_id
          ELSE mu.id
        END AS "recipientUserId"
      FROM performance_assessments a
      JOIN performance_cycles c ON c.id = a.cycle_id
      JOIN employees e ON e.id = a.reviewee_id
      JOIN users eu ON eu.id = e.user_id
      LEFT JOIN employees me ON me.id = e.manager_id
      LEFT JOIN users mu ON mu.id = me.user_id
      WHERE a.company_id = ${companyId}
        AND a.status <> 'submitted'
        AND c.end_date < CURRENT_DATE
        AND (
          a.type = 'self'
          OR (
            a.type = 'manager'
            AND EXISTS (
              SELECT 1 FROM performance_assessments s
              WHERE s.company_id = a.company_id
                AND s.cycle_id = a.cycle_id
                AND s.reviewee_id = a.reviewee_id
                AND s.type = 'self'
                AND s.status = 'submitted'
            )
          )
        )
    `);

    return (res.rows ?? []) as AssessmentRow[];
  }

  // =========================================================
  // ENQUEUE (DIGEST = LESS EMAIL)
  // =========================================================
  private async enqueueDigestNotifications(
    companyId: string,
    bucket: ReminderBucket,
    type: AssessmentType,
    rows: AssessmentRow[],
  ) {
    if (!rows.length) return;

    // Digest grouping: ONE email per recipient per cycle per bucket per type
    const groups = this.groupForDigest(rows, bucket, type);

    for (const [key, items] of groups.entries()) {
      const first = items[0];

      const dedupeKey = this.digestDedupeKey(
        companyId,
        bucket.eventType,
        type,
        first.toEmail,
        first.cycleId,
      );

      // payload contains a list of assessments => your template can render a simple list
      await this.engine.createAndEnqueue({
        companyId,
        channel: 'email',
        eventType: bucket.eventType, // keep same event types; template can detect digest via meta.digest=true
        entityType: 'cycle', // digest is cycle-centric (less spam); change if your system requires "assessment"
        entityId: first.cycleId,
        recipientUserId: first.recipientUserId,
        recipientEmployeeId: first.employeeId, // optional; first item
        recipientEmail: first.toEmail,
        dedupeKey,
        jobName: 'sendNotificationEvent',
        payload: {
          toEmail: first.toEmail,
          firstName: first.firstName,
          cycleName: first.cycleName,
          dueDate: first.dueDate,
          companyName: '',
          // digest-specific
          assessments: items.map((it) => ({
            assessmentId: it.assessmentId,
            employeeId: it.employeeId,
            employeeName: it.employeeName,
            reviewerName: it.reviewerName,
            type: it.type,
          })),
          meta: {
            digest: true,
            bucket: bucket.bucket,
            type,
            cycleId: first.cycleId,
          },
        },
      });
    }
  }

  private async enqueueOverdueDigest(companyId: string, rows: AssessmentRow[]) {
    if (!rows.length) return;

    const eventType = 'assessment_overdue';

    // One overdue digest per recipient per day (still “daily”, but only ONE email)
    const groups = this.groupOverdueForDigest(rows);

    for (const [key, items] of groups.entries()) {
      const first = items[0];
      const dedupeKey = `notif:${companyId}:assessment:digest:${eventType}:${first.toEmail.toLowerCase()}:d${this.todayIsoUTC()}`;

      await this.engine.createAndEnqueue({
        companyId,
        channel: 'email',
        eventType,
        entityType: 'assessment', // new event type for overdue digest (or keep same with meta.digest)
        entityId: companyId,
        recipientUserId: first.recipientUserId,
        recipientEmployeeId: first.employeeId,
        recipientEmail: first.toEmail,
        dedupeKey,
        jobName: 'sendNotificationEvent',
        payload: {
          toEmail: first.toEmail,
          firstName: first.firstName,
          companyName: '',
          assessments: items.map((it) => ({
            assessmentId: it.assessmentId,
            employeeId: it.employeeId,
            employeeName: it.employeeName,
            reviewerName: it.reviewerName,
            cycleId: it.cycleId,
            cycleName: it.cycleName,
            dueDate: it.dueDate,
            type: it.type,
          })),
          meta: {
            digest: true,
            bucket: 'overdue',
          },
        },
      });
    }
  }

  private groupForDigest(
    rows: AssessmentRow[],
    bucket: ReminderBucket,
    type: AssessmentType,
  ) {
    const map = new Map<string, AssessmentRow[]>();

    for (const r of rows) {
      const key = [
        bucket.eventType,
        type,
        r.toEmail.toLowerCase(),
        r.cycleId,
        new Date(r.dueDate).toISOString().slice(0, 10),
      ].join('|');

      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }

    return map;
  }

  private groupOverdueForDigest(rows: AssessmentRow[]) {
    const map = new Map<string, AssessmentRow[]>();

    for (const r of rows) {
      const key = [
        'assessment_overdue',
        r.toEmail.toLowerCase(),
        this.todayIsoUTC(),
      ].join('|');

      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }

    return map;
  }

  private digestDedupeKey(
    companyId: string,
    eventType: string,
    type: AssessmentType,
    toEmail: string,
    cycleId: string,
  ) {
    // One digest per (recipient + cycle + bucket + type) per day
    // If you want to allow re-sends, remove the date suffix.
    return `notif:${companyId}:assessment:digest:${eventType}:${type}:${toEmail.toLowerCase()}:${cycleId}:d${this.todayIsoUTC()}`;
  }

  private todayIsoUTC() {
    return new Date().toISOString().slice(0, 10);
  }
}
