import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { and, eq, lte } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import {
  performanceGoalCheckinSchedules,
  performanceGoalCompanyPolicies,
} from './schema/policies-and-checkins.schema';
import { performanceGoals } from '../goals/schema/performance-goals.schema';
import { employees, users } from 'src/drizzle/schema';
import { GoalNotificationService } from 'src/modules/notification/services/goal-notification.service';

const SYSTEM_POLICY_DEFAULTS = {
  visibility: 'company' as const,
  cadence: 'monthly' as const, // 'weekly' | 'biweekly' | 'monthly'
  timezone: 'Europe/London',
  anchorDow: 1, // Monday (1..7 => Mon..Sun)
  anchorHour: 9, // 09:00
};

export type EffectivePolicy = {
  visibility: 'private' | 'manager' | 'company';
  cadence: 'weekly' | 'biweekly' | 'monthly';
  timezone: string;
  anchorDow: number; // 1..7 (Mon..Sun)
  anchorHour: number; // 0..23
};

@Injectable()
export class PolicyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly notification: GoalNotificationService,
    @InjectQueue('emailQueue') private readonly emailQueue: Queue,
  ) {}

  // ---------------- cache helpers ----------------
  private tags(companyId: string) {
    return [`company:${companyId}:performance:policy`];
  }
  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // or: await this.cache.invalidateTags(this.tags(companyId));
  }

  // ---------------- company policy ----------------
  async getOrCreateCompanyPolicy(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['policy', 'company'],
      async () => {
        const [existing] = await this.db
          .select()
          .from(performanceGoalCompanyPolicies)
          .where(eq(performanceGoalCompanyPolicies.companyId, companyId))
          .limit(1);

        if (existing) return existing;

        const now = new Date();
        const [created] = await this.db
          .insert(performanceGoalCompanyPolicies)
          .values({
            companyId,
            defaultVisibility: SYSTEM_POLICY_DEFAULTS.visibility,
            defaultCadence: SYSTEM_POLICY_DEFAULTS.cadence,
            defaultTimezone: SYSTEM_POLICY_DEFAULTS.timezone,
            defaultAnchorDow: SYSTEM_POLICY_DEFAULTS.anchorDow,
            defaultAnchorHour: SYSTEM_POLICY_DEFAULTS.anchorHour,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .returning();

        if (created) return created;

        // race condition: re-fetch
        const [row] = await this.db
          .select()
          .from(performanceGoalCompanyPolicies)
          .where(eq(performanceGoalCompanyPolicies.companyId, companyId))
          .limit(1);

        return row!;
      },
      { tags: this.tags(companyId) },
    );
  }

  async upsertCompanyPolicy(
    companyId: string,
    userId: string,
    dto: {
      defaultVisibility?: 'private' | 'manager' | 'company';
      defaultCadence?: 'weekly' | 'biweekly' | 'monthly';
      defaultTimezone?: string;
      defaultAnchorDow?: number;
      defaultAnchorHour?: number;
    },
  ) {
    this.validate(dto);

    const now = new Date();
    const [row] = await this.db
      .insert(performanceGoalCompanyPolicies)
      .values({ companyId, ...dto, updatedAt: now })
      .onConflictDoUpdate({
        target: performanceGoalCompanyPolicies.companyId,
        set: { ...dto, updatedAt: now },
      })
      .returning();

    await this.audit.logAction({
      action: 'upsert',
      entity: 'performance_goal_company_policies',
      entityId: row.id,
      userId,
      details: `Upserted company policy for ${companyId}`,
      changes: dto,
    });

    await this.invalidate(companyId);
    return row;
  }

  /** Effective = company policy or system fallback */
  async getEffectivePolicy(companyId: string): Promise<EffectivePolicy> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['policy', 'effective'],
      async () => {
        const company = await this.getOrCreateCompanyPolicy(companyId);
        return {
          visibility: (company?.defaultVisibility ??
            SYSTEM_POLICY_DEFAULTS.visibility) as any,
          cadence: (company?.defaultCadence ??
            SYSTEM_POLICY_DEFAULTS.cadence) as any,
          timezone: company?.defaultTimezone ?? SYSTEM_POLICY_DEFAULTS.timezone,
          anchorDow:
            company?.defaultAnchorDow ?? SYSTEM_POLICY_DEFAULTS.anchorDow,
          anchorHour:
            company?.defaultAnchorHour ?? SYSTEM_POLICY_DEFAULTS.anchorHour,
        };
      },
      { tags: this.tags(companyId) },
    );
  }

  // ---------------- schedules (GOALS) ----------------
  /** Create or update the goal-level schedule from company policy */
  async upsertGoalScheduleFromPolicy(
    goalId: string,
    companyId: string,
    tx?: any,
    overrides?: Partial<
      Pick<EffectivePolicy, 'cadence' | 'timezone' | 'anchorDow' | 'anchorHour'>
    >,
  ) {
    // Ensure goal exists and belongs to the company
    const [goal] = await (tx ?? this.db)
      .select({
        id: performanceGoals.id,
        companyId: performanceGoals.companyId,
        isArchived: performanceGoals.isArchived,
      })
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.companyId, companyId),
        ),
      )
      .limit(1);

    if (!goal) throw new BadRequestException('Goal not found');

    const eff = await this.getEffectivePolicy(companyId);
    const cadence = overrides?.cadence ?? eff.cadence;
    const timezone = overrides?.timezone ?? eff.timezone;
    const anchorDow = overrides?.anchorDow ?? eff.anchorDow;
    const anchorHour = overrides?.anchorHour ?? eff.anchorHour;

    const nextDueAt = this.computeNextDueAt(
      new Date(),
      cadence,
      anchorDow,
      anchorHour,
    );

    const [existing] = await (tx ?? this.db)
      .select()
      .from(performanceGoalCheckinSchedules)
      .where(eq(performanceGoalCheckinSchedules.goalId, goalId))
      .limit(1);

    if (existing) {
      const [updated] = await (tx ?? this.db)
        .update(performanceGoalCheckinSchedules)
        .set({
          frequency: cadence as any,
          timezone,
          anchorDow,
          anchorHour,
          nextDueAt,
          updatedAt: new Date(),
        })
        .where(eq(performanceGoalCheckinSchedules.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await (tx ?? this.db)
      .insert(performanceGoalCheckinSchedules)
      .values({
        goalId,
        frequency: cadence as any,
        timezone,
        anchorDow,
        anchorHour,
        nextDueAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return created;
  }

  // ---------------- utils ----------------
  private validate(dto: Record<string, any>) {
    const inSet = (v: any, set: string[]) => v === undefined || set.includes(v);
    if (!inSet(dto.defaultVisibility, ['private', 'manager', 'company']))
      throw new BadRequestException(
        'defaultVisibility must be private|manager|company',
      );
    if (!inSet(dto.defaultCadence, ['weekly', 'biweekly', 'monthly']))
      throw new BadRequestException(
        'defaultCadence must be weekly|biweekly|monthly',
      );
    if (
      dto.defaultAnchorDow !== undefined &&
      (dto.defaultAnchorDow < 1 || dto.defaultAnchorDow > 7)
    )
      throw new BadRequestException('defaultAnchorDow must be 1..7');
    if (
      dto.defaultAnchorHour !== undefined &&
      (dto.defaultAnchorHour < 0 || dto.defaultAnchorHour > 23)
    )
      throw new BadRequestException('defaultAnchorHour must be 0..23');
  }

  /**
   * Compute the next due datetime from `from`, aligned to the given weekday/hour.
   * DOW is 1..7 (Mon..Sun) mapped to JS 0..6; monthly is approximated to +28 days.
   */
  private computeNextDueAt(
    from: Date,
    cadence: 'weekly' | 'biweekly' | 'monthly',
    anchorDow: number,
    anchorHour: number,
  ) {
    const now = new Date(from);
    // Build a UTC date at today's anchorHour
    const result = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        anchorHour,
        0,
        0,
        0,
      ),
    );

    // Map 1..7 (Mon..Sun) to JS 0..6
    const jsTarget = anchorDow % 7 === 0 ? 0 : anchorDow % 7; // 7 => 0 (Sun)
    const jsNow = result.getUTCDay();

    // days to add to reach the next target weekday
    let addDays = (jsTarget - jsNow + 7) % 7;
    if (addDays === 0 && result <= now) addDays = 7;
    result.setUTCDate(result.getUTCDate() + addDays);

    if (cadence === 'biweekly') {
      // First occurrence aligned; subsequent sends should roll +14 days in the worker
    } else if (cadence === 'monthly') {
      // Simple monthly == every 4 weeks; refine as needed
      result.setUTCDate(result.getUTCDate() + 28);
    }

    return result;
  }

  async processDueGoalCheckins(opts?: { companyId?: string; limit?: number }) {
    const { companyId, limit = 200 } = opts ?? {};
    const now = new Date();

    // 1) fetch due schedules (+ goal + recipient)
    const baseQuery = this.db
      .select({
        scheduleId: performanceGoalCheckinSchedules.id,
        goalId: performanceGoalCheckinSchedules.goalId,
        nextDueAt: performanceGoalCheckinSchedules.nextDueAt,
        frequency: performanceGoalCheckinSchedules.frequency,
        // goal
        goalTitle: performanceGoals.title,
        goalCompanyId: performanceGoals.companyId,
        isArchived: performanceGoals.isArchived,
        // owner (employee) -> user (recipient)
        employeeId: performanceGoals.employeeId,
        employeeUserId: users.id,
        employeeEmail: users.email,
        employeeName: users.firstName,
      })
      .from(performanceGoalCheckinSchedules)
      .innerJoin(
        performanceGoals,
        eq(performanceGoals.id, performanceGoalCheckinSchedules.goalId),
      )
      .leftJoin(employees, eq(employees.id, performanceGoals.employeeId))
      .leftJoin(users, eq(users.id, employees.userId));

    const due = await (
      companyId
        ? baseQuery.where(
            and(
              lte(performanceGoalCheckinSchedules.nextDueAt, now),
              eq(performanceGoals.isArchived, false),
              eq(performanceGoals.companyId, companyId),
            ),
          )
        : baseQuery.where(
            and(
              lte(performanceGoalCheckinSchedules.nextDueAt, now),
              eq(performanceGoals.isArchived, false),
            ),
          )
    ).limit(limit);

    if (!due.length) {
      return { processed: 0, enqueued: 0, skipped: 0, advanced: 0 };
    }

    let enqueued = 0;
    let skipped = 0;
    let advanced = 0;

    // 2) process each due schedule in a short transaction
    for (const r of due) {
      try {
        await this.db.transaction(async (tx) => {
          // Re-check inside txn for idempotency
          const [row] = await tx
            .select({
              id: performanceGoalCheckinSchedules.id,
              nextDueAt: performanceGoalCheckinSchedules.nextDueAt,
              frequency: performanceGoalCheckinSchedules.frequency,
            })
            .from(performanceGoalCheckinSchedules)
            .where(eq(performanceGoalCheckinSchedules.id, r.scheduleId))
            .limit(1);

          if (!row) {
            skipped++;
            return;
          }
          if (row.nextDueAt > new Date()) {
            // already handled by another worker
            skipped++;
            return;
          }

          if (r.employeeUserId && r.employeeEmail) {
            // 2a) enqueue the email job (idempotent jobId)
            const jobId = `goal-checkin:${r.scheduleId}:${row.nextDueAt.getTime()}`;
            await this.emailQueue.add(
              'sendGoalCheckin',
              {
                email: r.employeeEmail,
                name: r.employeeName,
                goalTitle: r.goalTitle,
                meta: { goalId: r.goalId, scheduleId: r.scheduleId },
                toUserId: r.employeeUserId,
                subject: `Check-in: "${r.goalTitle}"`,
                body: `Please update your progress for goal "${r.goalTitle}".`,
              },
              {
                jobId, // prevents duplicates for the same schedule occurrence
                removeOnComplete: 1000,
                removeOnFail: 500,
              },
            );
            enqueued++;
          } else {
            skipped++;
          }

          // 2b) roll next due forward (catch up if behind)
          const next = this.rollForward(
            row.nextDueAt,
            row.frequency as any,
            new Date(),
          );

          await tx
            .update(performanceGoalCheckinSchedules)
            .set({ nextDueAt: next, updatedAt: new Date() })
            .where(eq(performanceGoalCheckinSchedules.id, r.scheduleId));
          advanced++;

          // 2c) audit the enqueue
          await this.audit.logAction({
            action: 'enqueue',
            entity: 'performance_goal_checkin',
            entityId: r.scheduleId,
            userId: 'system',
            details: `Enqueued goal check-in for goal ${r.goalId} (${row.frequency})`,
            changes: { previousNextDueAt: r.nextDueAt, nextNextDueAt: next },
          });
        });
      } catch {
        // swallow per-item errors; you can add per-item error audit if you like
        skipped++;
      }
    }

    return { processed: due.length, enqueued, skipped, advanced };
  }

  /** Advance nextDueAt by +7 / +14 / +28 days until it's in the future. */
  private rollForward(
    current: Date,
    freq: 'weekly' | 'biweekly' | 'monthly',
    now: Date,
  ) {
    const stepDays = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 28;
    let next = new Date(current);
    while (next <= now) {
      next = new Date(next.getTime() + stepDays * 24 * 60 * 60 * 1000);
    }
    return next;
  }
}
