import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, sql, inArray, or, desc } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(FeedbackService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string, type?: string, deptId?: string) {
    return `fb:${companyId}:list:${type ?? 'all'}:${deptId ?? 'any'}`;
  }
  private empListKey(companyId: string, employeeId: string, type?: string) {
    return `fb:${companyId}:emp:${employeeId}:list:${type ?? 'all'}`;
  }
  private oneKey(companyId: string, id: string) {
    return `fb:${companyId}:one:${id}`;
  }

  private async burst(opts: {
    companyId: string;
    feedbackId?: string;
    employeeId?: string; // for employee-scoped lists
  }) {
    const jobs: Promise<any>[] = [];
    const types = [
      'all',
      'self',
      'peer',
      'employee_to_manager',
      'manager_to_employee',
      'archived',
    ];

    // item
    if (opts.feedbackId)
      jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.feedbackId)));

    // company lists (all type/department combos)
    for (const t of types)
      jobs.push(this.cache.del(this.listKey(opts.companyId, t)));
    // department-scoped variants are unknown; blow away common without deptId
    // (If you later cache per-dept aggressively, add a dept burst map here.)

    // employee lists
    if (opts.employeeId) {
      for (const t of types)
        jobs.push(
          this.cache.del(this.empListKey(opts.companyId, opts.employeeId, t)),
        );
    }

    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'feedback:cache:burst');
  }

  // ---------- helpers ----------
  private async getResponsesForFeedback(feedbackIds: string[]) {
    if (feedbackIds.length === 0) return [];
    return this.db
      .select({
        feedbackId: feedbackResponses.feedbackId,
        questionId: feedbackResponses.question,
      })
      .from(feedbackResponses)
      .where(inArray(feedbackResponses.feedbackId, feedbackIds));
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
        const m = await getManagerUserId();
        return m ? [m] : [];
      }
      case 'person_managers': {
        const ids: string[] = [];
        if (recipient.userId) ids.push(recipient.userId);
        const m = await getManagerUserId();
        if (m) ids.push(m);
        return ids;
      }
      case 'team': {
        if (!recipient.departmentId) return [];
        const teammates = await this.db.query.employees.findMany({
          where: (e, { eq }) => eq(e.departmentId, recipient.departmentId),
        });
        return teammates
          .map((t) => t.userId)
          .filter((id): id is string => !!id && id !== recipient.userId);
      }
      default:
        return [];
    }
  }

  // ---------- mutations ----------
  async create(dto: CreateFeedbackDto, user: User) {
    this.logger.info(
      { companyId: user.companyId, dtoType: dto.type },
      'feedback:create:start',
    );

    const { companyId, id: userId } = user;

    const [newFeedback] = await this.db
      .insert(performanceFeedback)
      .values({
        senderId: userId,
        recipientId: dto.recipientId,
        type: dto.type,
        isAnonymous: dto.isAnonymous ?? false,
        companyId,
      })
      .returning();

    if (dto.responses?.length) {
      await this.db.insert(feedbackResponses).values(
        dto.responses.map((r) => ({
          feedbackId: newFeedback.id,
          question: r.questionId,
          answer: r.answer,
        })),
      );
    }

    const viewerIds = await this.resolveViewerIds(
      dto.shareScope as 'private' | 'managers' | 'person_managers' | 'team',
      dto.recipientId,
    );

    if (viewerIds.length) {
      await this.db.insert(feedbackViewers).values(
        viewerIds.map((viewerId) => ({
          feedbackId: newFeedback.id,
          userId: viewerId,
        })),
      );
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
        isAnonymous: dto.isAnonymous,
      },
    });

    await this.burst({
      companyId,
      feedbackId: newFeedback.id,
      employeeId: dto.recipientId,
    });
    this.logger.info({ id: newFeedback.id }, 'feedback:create:done');
    return newFeedback;
  }

  async update(id: string, updateFeedbackDto: UpdateFeedbackDto, user: User) {
    this.logger.info({ id, userId: user.id }, 'feedback:update:start');

    const current = await this.findOne(id, user); // permission check (cached inside method)

    const [updated] = await this.db
      .update(performanceFeedback)
      .set(updateFeedbackDto)
      .where(eq(performanceFeedback.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'feedback',
      entityId: updated.id,
      userId: user.id,
      details: 'Feedback updated',
      changes: { ...updateFeedbackDto },
    });

    await this.burst({
      companyId: user.companyId,
      feedbackId: id,
      employeeId: (current as any)?.recipientId,
    });
    this.logger.info({ id }, 'feedback:update:done');
    return updated;
  }

  async remove(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'feedback:remove:start');

    const current = await this.findOne(id, user); // permission check

    const [deleted] = await this.db
      .update(performanceFeedback)
      .set({ isArchived: true })
      .where(eq(performanceFeedback.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'feedback',
      entityId: id,
      userId: user.id,
      details: 'Feedback deleted',
    });

    await this.burst({
      companyId: user.companyId,
      feedbackId: id,
      employeeId: (current as any)?.recipientId,
    });
    this.logger.info({ id }, 'feedback:remove:done');
    return deleted;
  }

  // ---------- queries ----------
  // Visible to a viewer (batched, no N+1)
  async getFeedbackForRecipient(recipientId: string, viewer: User) {
    this.logger.debug(
      { recipientId, viewerId: viewer.id },
      'feedback:getForRecipient:start',
    );

    const feedbacks = await this.db
      .select()
      .from(performanceFeedback)
      .where(eq(performanceFeedback.recipientId, recipientId));

    if (feedbacks.length === 0) return [];

    const ids = feedbacks.map((f) => f.id);

    const allowedLinks = await this.db
      .select({ feedbackId: feedbackViewers.feedbackId })
      .from(feedbackViewers)
      .where(
        and(
          inArray(feedbackViewers.feedbackId, ids),
          eq(feedbackViewers.userId, viewer.id),
        ),
      );

    const allowedIds = new Set(allowedLinks.map((a) => a.feedbackId));
    const visible = feedbacks.filter((f) => allowedIds.has(f.id));
    if (visible.length === 0) return [];

    const allResponses = await this.db
      .select()
      .from(feedbackResponses)
      .where(
        inArray(
          feedbackResponses.feedbackId,
          visible.map((v) => v.id),
        ),
      );

    const byFeedback = new Map<string, typeof allResponses>();
    for (const r of allResponses) {
      const arr = byFeedback.get(r.feedbackId) ?? [];
      arr.push(r);
      byFeedback.set(r.feedbackId, arr);
    }

    const out = visible.map((f) => ({
      ...f,
      responses: byFeedback.get(f.id) ?? [],
    }));
    this.logger.debug(
      { recipientId, count: out.length },
      'feedback:getForRecipient:done',
    );
    return out;
  }

  async getFeedbackBySender(senderId: string) {
    this.logger.debug({ senderId }, 'feedback:getBySender:start');

    const rows = await this.db
      .select()
      .from(performanceFeedback)
      .where(eq(performanceFeedback.senderId, senderId));

    this.logger.debug(
      { senderId, count: rows.length },
      'feedback:getBySender:done',
    );
    return rows;
  }

  async findAll(
    companyId: string,
    filters?: { type?: string; departmentId?: string },
  ) {
    const key = this.listKey(companyId, filters?.type, filters?.departmentId);
    this.logger.debug(
      { companyId, key, filters },
      'feedback:findAll:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
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

      const feedbacksRows = await this.db
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
        .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
        .leftJoin(departments, eq(departments.id, employees.departmentId))
        .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
        .leftJoin(users, eq(users.id, performanceFeedback.senderId))
        .orderBy(desc(performanceFeedback.createdAt));

      const feedbackIds = feedbacksRows.map((f) => f.id);
      const responses = await this.getResponsesForFeedback(feedbackIds);

      const mapped = feedbacksRows.map((f) => ({
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
      }));

      this.logger.debug(
        { companyId, count: mapped.length },
        'feedback:findAll:db:done',
      );
      return mapped;
    });
  }

  async findAllByEmployeeId(
    companyId: string,
    employeeId: string,
    filters?: { type?: string },
  ) {
    const key = this.empListKey(companyId, employeeId, filters?.type);
    this.logger.debug(
      { companyId, employeeId, key, filters },
      'feedback:findAllByEmp:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      if (!employeeId) return [];

      const [employee] = await this.db
        .select()
        .from(employees)
        .where(
          and(eq(employees.id, employeeId), eq(employees.companyId, companyId)),
        );

      if (!employee) {
        throw new NotFoundException('Employee not found in company');
      }

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

      const rows = await this.db
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
        .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
        .leftJoin(departments, eq(departments.id, employees.departmentId))
        .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
        .leftJoin(users, eq(users.id, performanceFeedback.senderId))
        .orderBy(desc(performanceFeedback.createdAt));

      const ids = rows.map((f) => f.id);
      const responseCounts = await this.getResponsesForFeedback(ids);

      const mapped = rows.map((f) => ({
        id: f.id,
        type: f.type,
        createdAt: f.createdAt,
        employeeName: f.employeeName,
        senderName: f.isAnonymous
          ? 'Anonymous'
          : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
        questionsCount: responseCounts.filter((r) => r.feedbackId === f.id)
          .length,
        departmentName: f.departmentName,
        jobRoleName: f.jobRoleName,
        departmentId: f.departmentId,
        isArchived: f.isArchived,
      }));

      this.logger.debug(
        { companyId, employeeId, count: mapped.length },
        'feedback:findAllByEmp:db:done',
      );
      return mapped;
    });
  }

  async findOne(id: string, user: User) {
    const key = this.oneKey(user.companyId, id);
    this.logger.debug({ id, key }, 'feedback:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [item] = await this.db
        .select({
          id: performanceFeedback.id,
          type: performanceFeedback.type,
          createdAt: performanceFeedback.createdAt,
          isAnonymous: performanceFeedback.isAnonymous,
          recipientId: performanceFeedback.recipientId,
          employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
          senderName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        })
        .from(performanceFeedback)
        .where(eq(performanceFeedback.id, id))
        .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
        .leftJoin(users, eq(users.id, performanceFeedback.senderId));

      if (!item) {
        this.logger.warn({ id }, 'feedback:findOne:not-found');
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
        );

      const allowedRoles = ['admin', 'super_admin'];
      const isPrivileged = allowedRoles.includes(user.role);

      if (!viewerAccess && !isPrivileged) {
        this.logger.warn({ id, userId: user.id }, 'feedback:findOne:forbidden');
        throw new ForbiddenException(
          'You do not have permission to view this feedback',
        );
      }

      const responses = await this.db
        .select({
          answer: feedbackResponses.answer,
          questionText: feedbackQuestions.question,
          inputType: feedbackQuestions.inputType,
        })
        .from(feedbackResponses)
        .where(eq(feedbackResponses.feedbackId, item.id))
        .leftJoin(
          feedbackQuestions,
          eq(feedbackResponses.question, feedbackQuestions.id),
        );

      const result = { ...item, responses };
      this.logger.debug({ id }, 'feedback:findOne:db:done');
      return result;
    });
  }
}
