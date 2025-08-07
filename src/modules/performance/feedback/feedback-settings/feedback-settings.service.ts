import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
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

@Injectable()
export class FeedbackSettingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  // Create default feedback settings
  async create(companyId: string) {
    const now = new Date();

    // 1. Insert into feedback_settings
    const [settings] = await this.db
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
          departments: [],
          offices: [],
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
        scope: {},
      },
      {
        group: 'manager',
        type: 'peer',
        enabled: true,
        scope: {},
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
        scope: {},
      },
    ] as const;

    // 2. Insert into feedback_rules
    for (const rule of defaultRules) {
      const [insertedRule] = await this.db
        .insert(feedbackRules)
        .values({
          companyId,
          group: rule.group,
          type: rule.type,
          enabled: rule.enabled,
          officeOnly:
            'officeOnly' in rule.scope ? (rule.scope as any).officeOnly : false,
          departmentOnly:
            'departmentOnly' in rule.scope
              ? (rule.scope as any).departmentOnly
              : false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // 3. If scope has offices or departments, insert into feedback_rule_scopes
      const officeScopes =
        rule.scope &&
        'offices' in rule.scope &&
        Array.isArray((rule.scope as any).offices)
          ? (rule.scope as any).offices
          : [];
      const departmentScopes =
        rule.scope &&
        'departments' in rule.scope &&
        Array.isArray((rule.scope as any).departments)
          ? (rule.scope as any).departments
          : [];

      const scopeEntries = [
        ...officeScopes.map((id) => ({
          ruleId: insertedRule.id,
          type: 'office' as const,
          referenceId: id,
          createdAt: now,
        })),
        ...departmentScopes.map((id) => ({
          ruleId: insertedRule.id,
          type: 'department' as const,
          referenceId: id,
          createdAt: now,
        })),
      ];

      if (scopeEntries.length > 0) {
        await this.db.insert(feedbackRuleScopes).values(scopeEntries);
      }
    }

    return settings;
  }

  async seedCompanies() {
    const allCompanies = await this.db
      .select({
        id: companies.id,
      })
      .from(companies)
      .execute();

    for (const company of allCompanies) {
      await this.create(company.id);
    }
  }

  // Retrieve feedback settings for a company
  async findOne(companyId: string) {
    const [settings] = await this.db
      .select()
      .from(feedbackSettings)
      .where(eq(feedbackSettings.companyId, companyId));

    if (!settings) {
      return {};
    }

    const rules = await this.db
      .select()
      .from(feedbackRules)
      .where(eq(feedbackRules.companyId, companyId));

    const ruleIds = rules.map((r) => r.id);

    const scopes = ruleIds.length
      ? await this.db
          .select()
          .from(feedbackRuleScopes)
          .where(inArray(feedbackRuleScopes.ruleId, ruleIds))
      : [];

    const feedbackRulesByGroup: Record<'employee' | 'manager', any[]> = {
      employee: [],
      manager: [],
    };

    for (const rule of rules) {
      const ruleScopes = scopes.filter((s) => s.ruleId === rule.id);

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

    if (!existing) {
      throw new NotFoundException('Feedback settings not found');
    }

    const [updated] = await this.db
      .update(feedbackSettings)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
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

    if (!existing) {
      throw new NotFoundException('Feedback settings not found');
    }

    const now = new Date();

    // Upsert rule
    const [rule] = await this.db
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
      await this.db
        .update(feedbackRules)
        .set({
          enabled,
          officeOnly: scope?.officeOnly ?? false,
          departmentOnly: scope?.departmentOnly ?? false,
          updatedAt: now,
        })
        .where(eq(feedbackRules.id, ruleId));
    } else {
      const [inserted] = await this.db
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

    // Replace scope records
    await this.db
      .delete(feedbackRuleScopes)
      .where(eq(feedbackRuleScopes.ruleId, ruleId));

    const scopes: Array<{
      ruleId: string;
      type: 'office' | 'department';
      referenceId: string;
    }> = [];

    for (const officeId of scope?.offices || []) {
      scopes.push({ ruleId, type: 'office', referenceId: officeId });
    }

    for (const deptId of scope?.departments || []) {
      scopes.push({ ruleId, type: 'department', referenceId: deptId });
    }

    if (scopes.length) {
      await this.db.insert(feedbackRuleScopes).values(scopes);
    }

    await this.auditService.logAction({
      action: 'update',
      entity: 'feedbackRule',
      entityId: ruleId,
      userId: user.id,
      details: `Updated feedback rule for ${group}.${type}`,
      changes: { enabled, scope },
    });

    return { success: true };
  }
}
