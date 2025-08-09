import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { feedbackSettings } from '../schema/performance-feedback-settings.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { feedbackRuleScopes } from '../schema/performance-feedback-rules-scopes.schema';
import { feedbackRules } from '../schema/performance-feedback-rules.schema';
import { UpdateFeedbackRuleDto } from '../dto/update-feedback-rule.dto';
import { UpdateFeedbackSettingsDto } from '../dto/update-feedback-settings.dto';
import { companies } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class FeedbackSettingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  // -------- cache keys (no TTL) --------
  private kSettings(companyId: string) {
    return `fs:settings:${companyId}`;
  }
  private kRules(companyId: string) {
    return `fs:rules:${companyId}`;
  }
  private async burst(companyId: string) {
    await Promise.allSettled([
      this.cache.del(this.kSettings(companyId)),
      this.cache.del(this.kRules(companyId)),
    ]);
  }

  // Create default feedback settings (idempotent + transactional)
  async create(companyId: string) {
    // guard: already exists?
    const [exists] = await this.db
      .select({ id: feedbackSettings.id })
      .from(feedbackSettings)
      .where(eq(feedbackSettings.companyId, companyId));
    if (exists) {
      // keep existing instead of erroring to make seeding safe
      return await this.findOne(companyId);
    }

    const now = new Date();

    const defaultRules = [
      {
        group: 'employee',
        type: 'self',
        enabled: true,
        scope: {
          officeOnly: false,
          departmentOnly: false,
          offices: [],
          departments: [],
        },
      },
      {
        group: 'employee',
        type: 'peer',
        enabled: true,
        scope: {
          officeOnly: true,
          departmentOnly: false,
          offices: [],
          departments: [],
        },
      },
      {
        group: 'employee',
        type: 'employee_to_manager',
        enabled: true,
        scope: {
          officeOnly: false,
          departmentOnly: true,
          offices: [],
          departments: [],
        },
      },
      {
        group: 'manager',
        type: 'self',
        enabled: true,
        scope: {
          officeOnly: false,
          departmentOnly: false,
          offices: [],
          departments: [],
        },
      },
      {
        group: 'manager',
        type: 'peer',
        enabled: true,
        scope: {
          officeOnly: false,
          departmentOnly: false,
          offices: [],
          departments: [],
        },
      },
      {
        group: 'manager',
        type: 'employee_to_manager',
        enabled: true,
        scope: {
          officeOnly: false,
          departmentOnly: true,
          offices: [],
          departments: [],
        },
      },
      {
        group: 'manager',
        type: 'manager_to_employee',
        enabled: false,
        scope: {
          officeOnly: false,
          departmentOnly: false,
          offices: [],
          departments: [],
        },
      },
    ] as const;

    const created = await this.db.transaction(async (trx) => {
      const [settings] = await trx
        .insert(feedbackSettings)
        .values({
          companyId,
          enableEmployeeFeedback: true,
          enableManagerFeedback: true,
          allowAnonymous: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      for (const rule of defaultRules) {
        const [insertedRule] = await trx
          .insert(feedbackRules)
          .values({
            companyId,
            group: rule.group,
            type: rule.type,
            enabled: rule.enabled,
            officeOnly: rule.scope.officeOnly,
            departmentOnly: rule.scope.departmentOnly,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const scopeEntries = [
          ...rule.scope.offices.map((id) => ({
            ruleId: insertedRule.id,
            type: 'office' as const,
            referenceId: id,
            createdAt: now,
          })),
          ...rule.scope.departments.map((id) => ({
            ruleId: insertedRule.id,
            type: 'department' as const,
            referenceId: id,
            createdAt: now,
          })),
        ];
        if (scopeEntries.length) {
          await trx.insert(feedbackRuleScopes).values(scopeEntries);
        }
      }

      return settings;
    });

    await this.burst(companyId);
    return created;
  }

  async seedCompanies() {
    const allCompanies = await this.db
      .select({ id: companies.id })
      .from(companies)
      .execute();
    for (const company of allCompanies) {
      await this.create(company.id); // idempotent now
    }
  }

  // Retrieve feedback settings for a company (cached)
  async findOne(companyId: string) {
    const settingsKey = this.kSettings(companyId);
    const rulesKey = this.kRules(companyId);

    const settings = await this.cache.getOrSetCache(settingsKey, async () => {
      const [row] = await this.db
        .select()
        .from(feedbackSettings)
        .where(eq(feedbackSettings.companyId, companyId));
      return row ?? null;
    });

    if (!settings) {
      // return empty object like your original, or choose to auto-create
      return {};
    }

    const rules = await this.cache.getOrSetCache(rulesKey, async () => {
      const r = await this.db
        .select()
        .from(feedbackRules)
        .where(eq(feedbackRules.companyId, companyId));
      const ruleIds = r.map((x) => x.id);
      const s = ruleIds.length
        ? await this.db
            .select()
            .from(feedbackRuleScopes)
            .where(inArray(feedbackRuleScopes.ruleId, ruleIds))
        : [];
      return { rules: r, scopes: s };
    });

    const feedbackRulesByGroup: Record<'employee' | 'manager', any[]> = {
      employee: [],
      manager: [],
    };

    for (const rule of rules.rules) {
      const ruleScopes = rules.scopes.filter((s) => s.ruleId === rule.id);
      const offices = ruleScopes
        .filter((s) => s.type === 'office')
        .map((s) => s.referenceId);
      const departments = ruleScopes
        .filter((s) => s.type === 'department')
        .map((s) => s.referenceId);

      feedbackRulesByGroup[rule.group].push({
        type: rule.type,
        enabled: rule.enabled,
        scope: {
          officeOnly: rule.officeOnly,
          departmentOnly: rule.departmentOnly,
          offices,
          departments,
        },
      });
    }

    return {
      id: settings.id,
      companyId: settings.companyId,
      enableEmployeeFeedback: settings.enableEmployeeFeedback,
      enableManagerFeedback: settings.enableManagerFeedback,
      allowAnonymous: settings.allowAnonymous,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      rules: feedbackRulesByGroup,
    };
  }

  async update(companyId: string, dto: UpdateFeedbackSettingsDto, user: User) {
    const [existing] = await this.db
      .select()
      .from(feedbackSettings)
      .where(eq(feedbackSettings.companyId, companyId));

    if (!existing) throw new NotFoundException('Feedback settings not found');

    const [updated] = await this.db
      .update(feedbackSettings)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(feedbackSettings.companyId, companyId))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'feedbackSettings',
      entityId: updated.id,
      userId: user.id,
      details: 'Updated feedback configuration settings',
      changes: dto,
    });

    await this.burst(companyId);
    return updated;
  }

  async updateSingleRule(
    companyId: string,
    dto: UpdateFeedbackRuleDto,
    user: User,
  ) {
    const { group, type, enabled, scope } = dto;

    const [existing] = await this.db
      .select()
      .from(feedbackSettings)
      .where(eq(feedbackSettings.companyId, companyId));
    if (!existing) throw new NotFoundException('Feedback settings not found');

    const now = new Date();

    await this.db.transaction(async (trx) => {
      const [rule] = await trx
        .select()
        .from(feedbackRules)
        .where(
          and(
            eq(feedbackRules.companyId, companyId),
            eq(feedbackRules.group, group),
            eq(feedbackRules.type, type),
          ),
        );

      let ruleId = rule?.id;

      if (ruleId) {
        await trx
          .update(feedbackRules)
          .set({
            enabled,
            officeOnly: scope?.officeOnly ?? false,
            departmentOnly: scope?.departmentOnly ?? false,
            updatedAt: now,
          })
          .where(eq(feedbackRules.id, ruleId));
      } else {
        const [inserted] = await trx
          .insert(feedbackRules)
          .values({
            companyId,
            group,
            type,
            enabled,
            officeOnly: scope?.officeOnly ?? false,
            departmentOnly: scope?.departmentOnly ?? false,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        ruleId = inserted.id;
      }

      await trx
        .delete(feedbackRuleScopes)
        .where(eq(feedbackRuleScopes.ruleId, ruleId!));

      const entries: Array<{
        ruleId: string;
        type: 'office' | 'department';
        referenceId: string;
        createdAt: Date;
      }> = [];
      for (const officeId of scope?.offices || []) {
        entries.push({
          ruleId: ruleId!,
          type: 'office',
          referenceId: officeId,
          createdAt: now,
        });
      }
      for (const deptId of scope?.departments || []) {
        entries.push({
          ruleId: ruleId!,
          type: 'department',
          referenceId: deptId,
          createdAt: now,
        });
      }
      if (entries.length) await trx.insert(feedbackRuleScopes).values(entries);
    });

    await this.auditService.logAction({
      action: 'update',
      entity: 'feedbackRule',
      entityId: `${companyId}:${group}.${type}`,
      userId: user.id,
      details: `Updated feedback rule for ${group}.${type}`,
      changes: { enabled, scope },
    });

    await this.burst(companyId);
    return { success: true };
  }
}
