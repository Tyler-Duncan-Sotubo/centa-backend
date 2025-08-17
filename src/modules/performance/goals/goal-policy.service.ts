// src/modules/performance/policy/policy.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { groups, groupMemberships } from 'src/drizzle/schema';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { objectives } from './schema/performance-objectives.schema';
import {
  performanceOkrCompanyPolicies,
  performanceOkrTeamPolicies,
  performanceCheckinSchedules,
} from './schema/policies-and-checkins.schema';
import { UpsertCompanyPolicyDto, UpsertTeamPolicyDto } from './dto/policy.dtos';

// --- SYSTEM DEFAULTS (server-side) ---
const SYSTEM_POLICY_DEFAULTS = {
  visibility: 'company' as 'private' | 'manager' | 'company',
  cadence: 'monthly' as 'weekly' | 'biweekly' | 'monthly',
  timezone: 'Europe/London',
  anchorDow: 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7, // Monday..Sunday
  anchorHour: 9 as number, // 0..23
  defaultOwnerIsLead: true,
};

export type EffectivePolicy = {
  visibility: 'private' | 'manager' | 'company';
  cadence: 'weekly' | 'biweekly' | 'monthly';
  timezone: string | null;
  anchorDow: number; // 1..7
  anchorHour: number; // 0..23
  defaultOwnerIsLead: boolean;
  // optional source flags (handy in UI)
  _source?: {
    visibility: 'system' | 'company' | 'team';
    cadence: 'system' | 'company' | 'team';
    timezone: 'system' | 'company' | 'team' | 'none';
    anchorDow: 'system' | 'company' | 'team';
    anchorHour: 'system' | 'company' | 'team';
    defaultOwnerIsLead: 'system' | 'team';
  };
};

// --- SERVICE ---
@Injectable()
export class PolicyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
  ) {}

  /** Get or lazily create a company policy row (seeded from system defaults). */
  async getOrCreateCompanyPolicy(companyId: string) {
    const [existing] = await this.db
      .select()
      .from(performanceOkrCompanyPolicies)
      .where(eq(performanceOkrCompanyPolicies.companyId, companyId))
      .limit(1);

    if (existing) return existing;

    // lazily seed
    const now = new Date();
    const [created] = await this.db
      .insert(performanceOkrCompanyPolicies)
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

    // concurrent create won—re-fetch
    const [row] = await this.db
      .select()
      .from(performanceOkrCompanyPolicies)
      .where(eq(performanceOkrCompanyPolicies.companyId, companyId))
      .limit(1);

    return row!;
  }

  /** Upsert company policy (admin). */
  async upsertCompanyPolicy(
    companyId: string,
    userId: string,
    dto: UpsertCompanyPolicyDto,
  ) {
    this.validatePolicyPatch(dto);

    const now = new Date();
    const [row] = await this.db
      .insert(performanceOkrCompanyPolicies)
      .values({ companyId, ...dto, updatedAt: now })
      .onConflictDoUpdate({
        target: performanceOkrCompanyPolicies.companyId,
        set: { ...dto, updatedAt: now },
      })
      .returning();

    await this.audit.logAction({
      action: 'upsert',
      entity: 'performance_okr_company_policies',
      entityId: row.id,
      userId,
      details: `Upserted company policy for ${companyId}`,
      changes: dto,
    });

    return row;
  }

  /** Upsert a team policy (override). Unique on (companyId, groupId). */
  async upsertTeamPolicy(
    companyId: string,
    groupId: string,
    userId: string,
    dto: UpsertTeamPolicyDto,
  ) {
    this.validatePolicyPatch(dto);

    // ensure group belongs to this company (optional safety)
    const [grp] = await this.db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!grp) throw new BadRequestException('Group not found');

    const now = new Date();
    const [row] = await this.db
      .insert(performanceOkrTeamPolicies)
      .values({ companyId, groupId, ...dto, updatedAt: now })
      .onConflictDoUpdate({
        target: [
          performanceOkrTeamPolicies.companyId,
          performanceOkrTeamPolicies.groupId,
        ],
        set: { ...dto, updatedAt: now },
      })
      .returning();

    await this.audit.logAction({
      action: 'upsert',
      entity: 'performance_okr_team_policies',
      entityId: row.id,
      userId,
      details: `Upserted team policy for group ${groupId}`,
      changes: dto,
    });

    return row;
  }

  /** Read effective policy: system → company → team. */
  async getEffectivePolicy(
    companyId: string,
    groupId?: string | null,
  ): Promise<EffectivePolicy> {
    const company = await this.getOrCreateCompanyPolicy(companyId);

    let team = null as any;
    if (groupId) {
      const [t] = await this.db
        .select()
        .from(performanceOkrTeamPolicies)
        .where(
          and(
            eq(performanceOkrTeamPolicies.companyId, companyId),
            eq(performanceOkrTeamPolicies.groupId, groupId),
          ),
        )
        .limit(1);
      team = t ?? null;
    }

    const eff: EffectivePolicy = {
      visibility: (team?.visibility ??
        company?.defaultVisibility ??
        SYSTEM_POLICY_DEFAULTS.visibility) as any,
      cadence: (team?.cadence ??
        company?.defaultCadence ??
        SYSTEM_POLICY_DEFAULTS.cadence) as any,
      timezone:
        (team?.timezone ??
          company?.defaultTimezone ??
          SYSTEM_POLICY_DEFAULTS.timezone) ||
        null,
      anchorDow:
        team?.anchorDow ??
        company?.defaultAnchorDow ??
        SYSTEM_POLICY_DEFAULTS.anchorDow,
      anchorHour:
        team?.anchorHour ??
        company?.defaultAnchorHour ??
        SYSTEM_POLICY_DEFAULTS.anchorHour,
      defaultOwnerIsLead:
        team?.defaultOwnerIsLead ?? SYSTEM_POLICY_DEFAULTS.defaultOwnerIsLead,
      _source: {
        visibility: team?.visibility
          ? 'team'
          : company?.defaultVisibility
            ? 'company'
            : 'system',
        cadence: team?.cadence
          ? 'team'
          : company?.defaultCadence
            ? 'company'
            : 'system',
        timezone: team?.timezone
          ? 'team'
          : company?.defaultTimezone
            ? 'company'
            : 'system',
        anchorDow: team?.anchorDow
          ? 'team'
          : company?.defaultAnchorDow
            ? 'company'
            : 'system',
        anchorHour: team?.anchorHour
          ? 'team'
          : company?.defaultAnchorHour
            ? 'company'
            : 'system',
        defaultOwnerIsLead:
          team?.defaultOwnerIsLead !== undefined ? 'team' : 'system',
      },
    };

    // sanity checks
    this.assertBounds(eff.anchorDow, 1, 7, 'anchorDow');
    this.assertBounds(eff.anchorHour, 0, 23, 'anchorHour');

    return eff;
  }

  /** Create or update the objective-level schedule from an effective policy. */
  async upsertObjectiveScheduleFromPolicy(
    objectiveId: string,
    companyId: string,
    groupId?: string | null,
    overrides?: Partial<
      Pick<EffectivePolicy, 'cadence' | 'timezone' | 'anchorDow' | 'anchorHour'>
    >,
  ) {
    // ensure objective exists (optional but helpful)
    const [obj] = await this.db
      .select({ id: objectives.id })
      .from(objectives)
      .where(eq(objectives.id, objectiveId))
      .limit(1);
    if (!obj) throw new BadRequestException('Objective not found');

    const eff = await this.getEffectivePolicy(companyId, groupId);
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

    // Check if schedule exists
    const [existing] = await this.db
      .select()
      .from(performanceCheckinSchedules)
      .where(eq(performanceCheckinSchedules.objectiveId, objectiveId))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(performanceCheckinSchedules)
        .set({
          frequency: cadence as any,
          timezone,
          anchorDow,
          anchorHour,
          nextDueAt,
          updatedAt: new Date(),
        })
        .where(eq(performanceCheckinSchedules.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(performanceCheckinSchedules)
      .values({
        objectiveId,
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

  /** Optional helper if your policy uses "default owner is team lead" */
  async resolveOwnerFromTeamLead(groupId?: string | null) {
    if (!groupId) return null;
    const [lead] = await this.db
      .select({ employeeId: groupMemberships.employeeId })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.role, 'lead'),
          sql`${groupMemberships.endDate} IS NULL`,
        ),
      )
      .orderBy(sql`${groupMemberships.joinedAt} DESC`)
      .limit(1);
    return lead?.employeeId ?? null;
  }

  // ----------------- utils -----------------

  private validatePolicyPatch(dto: Record<string, any>) {
    if (dto.defaultAnchorDow !== undefined)
      this.assertBounds(dto.defaultAnchorDow, 1, 7, 'defaultAnchorDow');
    if (dto.defaultAnchorHour !== undefined)
      this.assertBounds(dto.defaultAnchorHour, 0, 23, 'defaultAnchorHour');
    if (dto.anchorDow !== undefined)
      this.assertBounds(dto.anchorDow, 1, 7, 'anchorDow');
    if (dto.anchorHour !== undefined)
      this.assertBounds(dto.anchorHour, 0, 23, 'anchorHour');
    if (
      dto.defaultCadence &&
      !['weekly', 'biweekly', 'monthly'].includes(dto.defaultCadence)
    )
      throw new BadRequestException(
        'defaultCadence must be weekly|biweekly|monthly',
      );
    if (dto.cadence && !['weekly', 'biweekly', 'monthly'].includes(dto.cadence))
      throw new BadRequestException('cadence must be weekly|biweekly|monthly');
  }

  private assertBounds(n: number, min: number, max: number, field: string) {
    if (typeof n !== 'number' || n < min || n > max) {
      throw new BadRequestException(
        `${field} must be between ${min} and ${max}`,
      );
    }
  }

  /**
   * Compute next due instant in UTC using an anchor weekday (1..7 Mon..Sun) and hour (0..23).
   * Keep it simple here; if you need strict local tz math, convert using Luxon/Temporal in your worker.
   */
  private computeNextDueAt(
    from: Date,
    cadence: 'weekly' | 'biweekly' | 'monthly',
    anchorDow: number,
    anchorHour: number,
  ) {
    const now = new Date(from);
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

    // JS: 0=Sun..6=Sat; anchorDow: 1=Mon..7=Sun -> normalize to 0..6
    const targetJs = anchorDow % 7 === 0 ? 0 : anchorDow % 7; // 7->0 (Sun)
    const currentJs = result.getUTCDay();

    let addDays = (targetJs - currentJs + 7) % 7;
    if (addDays === 0 && result <= now) addDays = 7; // if today’s anchor passed, move to next week
    result.setUTCDate(result.getUTCDate() + addDays);

    if (cadence === 'biweekly') {
      // next anchor; worker will roll +14d after sending reminders
      return result;
    }
    if (cadence === 'monthly') {
      // month jump: keep weekday-of-month feel—simple approach: add ~4 weeks
      result.setUTCDate(result.getUTCDate() + 28);
      return result;
    }
    return result; // weekly
  }
}
