import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and, sql, inArray, or } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { feedbackViewers } from './schema/performance-feedback-viewers.schema';
import { performanceFeedback } from './schema/performance-feedback.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { feedbackResponses } from './schema/performance-feedback-responses.schema';
import {
  companyRoles,
  departments,
  employees,
  jobRoles,
  users,
} from 'src/drizzle/schema';
import { feedbackQuestions } from './schema/performance-feedback-questions.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [`company:${companyId}:feedback`];
  }
  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // Or, if you wire native Redis tagging:
    // await this.cache.invalidateTags(this.tags(companyId));
  }

  async create(dto: CreateFeedbackDto, user: User) {
    const { companyId, id: userId } = user;

    // Create feedback
    const [newFeedback] = await this.db
      .insert(performanceFeedback)
      .values({
        senderId: userId,
        recipientId: dto.recipientId,
        type: dto.type,
        isAnonymous: dto.isAnonymous ?? false,
        companyId,
      })
      .returning()
      .execute();

    // Insert responses
    if (dto.responses?.length) {
      await this.db
        .insert(feedbackResponses)
        .values(
          dto.responses.map((r) => ({
            feedbackId: newFeedback.id,
            question: r.questionId, // schema uses "question" column (id)
            answer: r.answer,
          })),
        )
        .execute();
    }

    // Resolve viewer IDs and insert viewers
    const viewerIds = await this.resolveViewerIds(
      (dto.shareScope as 'private' | 'managers' | 'person_managers' | 'team') ??
        'private',
      dto.recipientId,
    );
    if (viewerIds.length) {
      await this.db
        .insert(feedbackViewers)
        .values(
          viewerIds.map((viewerId) => ({
            feedbackId: newFeedback.id,
            userId: viewerId,
          })),
        )
        .execute();
    }

    await this.auditService.logAction({
      action: 'create',
      entity: 'feedback',
      entityId: newFeedback.id,
      userId,
      details: 'Feedback created',
      changes: {
        feedbackId: newFeedback.id,
        recipientId: dto.recipientId,
        type: dto.type,
        isAnonymous: dto.isAnonymous ?? false,
      },
    });

    await this.invalidate(companyId);

    return newFeedback;
  }

  private async resolveViewerIds(
    scope: 'private' | 'managers' | 'person_managers' | 'team',
    recipientId: string,
  ): Promise<string[]> {
    const [recipient] = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, recipientId))
      .execute();
    if (!recipient) return [];

    const getManagerUserId = async () => {
      if (recipient.managerId) {
        const [manager] = await this.db
          .select()
          .from(employees)
          .where(eq(employees.id, recipient.managerId))
          .execute();
        if (manager?.userId) return manager.userId;
      }
      const [superAdmin] = await this.db
        .select({ id: users.id })
        .from(users)
        .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
        .where(
          and(
            eq(users.companyId, recipient.companyId),
            eq(companyRoles.name, 'super_admin'),
          ),
        )
        .limit(1)
        .execute();
      return superAdmin?.id ?? null;
    };

    switch (scope) {
      case 'private':
        return recipient.userId ? [recipient.userId] : [];
      case 'managers': {
        const managerUserId = await getManagerUserId();
        return managerUserId ? [managerUserId] : [];
      }
      case 'person_managers': {
        const ids: string[] = [];
        if (recipient.userId) ids.push(recipient.userId);
        const managerUserId = await getManagerUserId();
        if (managerUserId) ids.push(managerUserId);
        return ids;
      }
      case 'team': {
        if (!recipient.departmentId) return [];
        const teammates = await this.db.query.employees.findMany({
          where: (e, { eq }) => eq(e.departmentId, recipient.departmentId),
        });
        return teammates
          .map((t) => t.userId)
          .filter((id): id is string => !!id);
      }
    }
  }

  // Visible feedback for a recipient to a given viewer
  async getFeedbackForRecipient(recipientId: string, viewer: User) {
    const feedbacks = await this.db
      .select()
      .from(performanceFeedback)
      .where(eq(performanceFeedback.recipientId, recipientId))
      .execute();

    const visibleFeedback: any[] = [];
    for (const fb of feedbacks) {
      const [viewerAccess] = await this.db
        .select()
        .from(feedbackViewers)
        .where(
          and(
            eq(feedbackViewers.feedbackId, fb.id),
            eq(feedbackViewers.userId, viewer.id),
          ),
        )
        .execute();
      if (!viewerAccess) continue;

      const responses = await this.db
        .select()
        .from(feedbackResponses)
        .where(eq(feedbackResponses.feedbackId, fb.id))
        .execute();

      visibleFeedback.push({ ...fb, responses });
    }
    return visibleFeedback;
  }

  async getFeedbackBySender(senderId: string) {
    return this.db
      .select()
      .from(performanceFeedback)
      .where(eq(performanceFeedback.senderId, senderId))
      .execute();
  }

  async getResponsesForFeedback(feedbackIds: string[]) {
    if (!feedbackIds.length) return [];
    return this.db
      .select({
        feedbackId: feedbackResponses.feedbackId,
        questionId: feedbackResponses.question,
      })
      .from(feedbackResponses)
      .where(inArray(feedbackResponses.feedbackId, feedbackIds))
      .execute();
  }

  async findAll(
    companyId: string,
    filters?: { type?: string; departmentId?: string },
  ) {
    return this.cache.getOrSetVersioned(
      companyId,
      [
        'feedback',
        'list',
        filters?.type ?? 'all',
        filters?.departmentId ?? 'any',
      ],
      async () => {
        const conditions = [
          eq(performanceFeedback.companyId, companyId),
          filters?.type === 'archived'
            ? eq(performanceFeedback.isArchived, true)
            : eq(performanceFeedback.isArchived, false),
        ];

        if (
          filters?.type &&
          filters.type !== 'all' &&
          filters.type !== 'archived'
        ) {
          conditions.push(eq(performanceFeedback.type, filters.type));
        }
        if (filters?.departmentId) {
          conditions.push(eq(departments.id, filters.departmentId));
        }

        const feedbacks = await this.db
          .select({
            id: performanceFeedback.id,
            type: performanceFeedback.type,
            createdAt: performanceFeedback.createdAt,
            isAnonymous: performanceFeedback.isAnonymous,
            isArchived: performanceFeedback.isArchived,
            employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            senderFirstName: users.firstName,
            senderLastName: users.lastName,
            departmentName: departments.name,
            departmentId: departments.id,
            jobRoleName: jobRoles.title,
          })
          .from(performanceFeedback)
          .where(and(...conditions))
          .leftJoin(
            employees,
            eq(employees.id, performanceFeedback.recipientId),
          )
          .leftJoin(departments, eq(departments.id, employees.departmentId))
          .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
          .leftJoin(users, eq(users.id, performanceFeedback.senderId))
          .execute();

        const feedbackIds = feedbacks.map((f) => f.id);
        const responses = await this.getResponsesForFeedback(feedbackIds);

        return feedbacks.map((f) => ({
          id: f.id,
          type: f.type,
          createdAt: f.createdAt,
          employeeName: f.employeeName,
          senderName: f.isAnonymous
            ? 'Anonymous'
            : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
          questionsCount: responses.filter((r) => r.feedbackId === f.id).length,
          departmentName: f.departmentName,
          jobRoleName: f.jobRoleName,
          departmentId: f.departmentId,
          isArchived: f.isArchived,
        }));
      },
      { tags: this.tags(companyId) },
    );
  }

  async getCounts(companyId: string, expectedTypes: string[] = []) {
    // group by type (non-archived)
    const typeRows = await this.db
      .select({
        type: performanceFeedback.type,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(performanceFeedback)
      .where(
        and(
          eq(performanceFeedback.companyId, companyId),
          eq(performanceFeedback.isArchived, false),
        ),
      )
      .groupBy(performanceFeedback.type);

    // totals (all non-archived, and archived)
    const [totals] = await this.db
      .select({
        all: sql<number>`cast(sum(case when ${performanceFeedback.isArchived} = false then 1 else 0 end) as int)`,
        archived: sql<number>`cast(sum(case when ${performanceFeedback.isArchived} = true  then 1 else 0 end) as int)`,
      })
      .from(performanceFeedback)
      .where(eq(performanceFeedback.companyId, companyId));

    // Build byType map
    const byType: Record<string, number> = {};
    for (const r of typeRows) {
      // r.type might be nullable depending on schema; guard just in case
      const key = (r.type ?? 'unknown') as string;
      byType[key] = r.count ?? 0;
    }

    // Normalize zeros for expectedTypes (optional)
    for (const t of expectedTypes) {
      if (!(t in byType)) byType[t] = 0;
    }

    return {
      all: totals?.all ?? 0,
      archived: totals?.archived ?? 0,
      ...byType,
    };
  }

  async findAllByEmployeeId(
    companyId: string,
    employeeId: string,
    filters?: { type?: string },
  ) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['feedback', 'by-employee', employeeId, filters?.type ?? 'all'],
      async () => {
        if (!employeeId) return [];

        const [employee] = await this.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, employeeId),
              eq(employees.companyId, companyId),
            ),
          )
          .execute();
        if (!employee) return [];

        const baseCondition = and(
          eq(performanceFeedback.companyId, companyId),
          or(
            eq(performanceFeedback.senderId, employee.userId),
            eq(performanceFeedback.recipientId, employeeId),
          ),
          filters?.type === 'archived'
            ? eq(performanceFeedback.isArchived, true)
            : eq(performanceFeedback.isArchived, false),
        );

        const conditions = [baseCondition];
        if (
          filters?.type &&
          filters.type !== 'all' &&
          filters.type !== 'archived'
        ) {
          conditions.push(eq(performanceFeedback.type, filters.type));
        }

        const feedbacks = await this.db
          .select({
            id: performanceFeedback.id,
            type: performanceFeedback.type,
            createdAt: performanceFeedback.createdAt,
            isAnonymous: performanceFeedback.isAnonymous,
            isArchived: performanceFeedback.isArchived,
            employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            senderFirstName: users.firstName,
            senderLastName: users.lastName,
            departmentName: departments.name,
            departmentId: departments.id,
            jobRoleName: jobRoles.title,
          })
          .from(performanceFeedback)
          .where(and(...conditions))
          .leftJoin(
            employees,
            eq(employees.id, performanceFeedback.recipientId),
          )
          .leftJoin(departments, eq(departments.id, employees.departmentId))
          .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
          .leftJoin(users, eq(users.id, performanceFeedback.senderId))
          .execute();

        const feedbackIds = feedbacks.map((f) => f.id);
        const responses = await this.getResponsesForFeedback(feedbackIds);

        return feedbacks.map((f) => ({
          id: f.id,
          type: f.type,
          createdAt: f.createdAt,
          employeeName: f.employeeName,
          senderName: f.isAnonymous
            ? 'Anonymous'
            : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
          questionsCount: responses.filter((r) => r.feedbackId === f.id).length,
          departmentName: f.departmentName,
          jobRoleName: f.jobRoleName,
          departmentId: f.departmentId,
          isArchived: f.isArchived,
        }));
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string, user: User) {
    // ✅ Permission check first (not cached)
    const [item] = await this.db
      .select({
        id: performanceFeedback.id,
        companyId: performanceFeedback.companyId,
        type: performanceFeedback.type,
        createdAt: performanceFeedback.createdAt,
        isAnonymous: performanceFeedback.isAnonymous,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
      })
      .from(performanceFeedback)
      .where(eq(performanceFeedback.id, id))
      .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
      .leftJoin(users, eq(users.id, performanceFeedback.senderId))
      .execute();

    if (!item) {
      throw new NotFoundException('Feedback not found');
    }

    const [viewerAccess] = await this.db
      .select()
      .from(feedbackViewers)
      .where(
        and(
          eq(feedbackViewers.feedbackId, id),
          eq(feedbackViewers.userId, user.id),
        ),
      )
      .execute();

    const allowedRoles = ['admin', 'super_admin'];
    const isPrivileged = allowedRoles.includes((user as any).role);

    if (!viewerAccess && !isPrivileged) {
      // preserve your current behaviour; alternatively throw ForbiddenException
      return 'You do not have permission to view this feedback';
    }

    // 🔒 After permission passes, cache the heavy data block by feedback id.
    const payload = await this.cache.getOrSetVersioned(
      item.companyId,
      ['feedback', 'one', id],
      async () => {
        const responses = await this.db
          .select({
            answer: feedbackResponses.answer,
            questionText: feedbackQuestions.question,
            inputType: feedbackQuestions.inputType,
          })
          .from(feedbackResponses)
          .where(eq(feedbackResponses.feedbackId, id))
          .leftJoin(
            feedbackQuestions,
            eq(feedbackResponses.question, feedbackQuestions.id),
          )
          .execute();

        const senderName = item.isAnonymous
          ? 'Anonymous'
          : `${item.senderFirstName ?? ''} ${item.senderLastName ?? ''}`.trim();

        return {
          id: item.id,
          type: item.type,
          createdAt: item.createdAt,
          isAnonymous: item.isAnonymous,
          employeeName: item.employeeName,
          senderName,
          responses,
        };
      },
      { tags: this.tags(item.companyId) },
    );

    return payload;
  }

  async update(id: string, updateFeedbackDto: UpdateFeedbackDto, user: User) {
    const current = await this.findOne(id, user); // permission check
    if (!current || typeof current === 'string') {
      // not allowed or not found (string means permission denied string per above)
      return current;
    }

    const [updated] = await this.db
      .update(performanceFeedback)
      .set(updateFeedbackDto)
      .where(eq(performanceFeedback.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'feedback',
      entityId: updated.id,
      userId: user.id,
      details: 'Feedback updated',
      changes: { ...updateFeedbackDto },
    });

    await this.invalidate(updated.companyId);
    return updated;
  }

  async remove(id: string, user: User) {
    const current = await this.findOne(id, user); // permission check
    if (!current || typeof current === 'string') {
      return current;
    }

    const [deleted] = await this.db
      .update(performanceFeedback)
      .set({ isArchived: true })
      .where(eq(performanceFeedback.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'feedback',
      entityId: id,
      userId: user.id,
      details: 'Feedback deleted',
    });

    await this.invalidate(deleted.companyId);
    return deleted;
  }
}
