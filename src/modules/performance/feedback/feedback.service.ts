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

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateFeedbackDto, user: User) {
    const { companyId, id: userId } = user;

    // Create feedback entry
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

    // Insert responses
    await this.db.insert(feedbackResponses).values(
      dto.responses.map((r) => ({
        feedbackId: newFeedback.id,
        question: r.questionId,
        answer: r.answer,
      })),
    );

    // Resolve viewer IDs based on shareScope
    const viewerIds = await this.resolveViewerIds(
      dto.shareScope as 'private' | 'managers' | 'person_managers' | 'team',
      dto.recipientId,
    );

    // Insert viewers
    const viewerPayload = viewerIds.map((viewerId) => ({
      feedbackId: newFeedback.id,
      userId: viewerId,
    }));

    await this.db.insert(feedbackViewers).values(viewerPayload);

    // Log audit
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

      // Fallback: get super_admin from the same company
      const [superAdmin] = await this.db
        .select({
          id: users.id,
        })
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

      return superAdmin.id ?? null;
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

      default:
        return [];
    }
  }

  // 2. Get Feedback Visible to a Recipient
  async getFeedbackForRecipient(recipientId: string, viewer: User) {
    // Get all feedbacks sent to the recipient
    const feedbacks = await this.db
      .select()
      .from(performanceFeedback)
      .where(eq(performanceFeedback.recipientId, recipientId));

    const visibleFeedback: any[] = [];

    for (const fb of feedbacks) {
      // Check if the viewer is allowed to see it (shared with them)
      const [viewerAccess] = await this.db
        .select()
        .from(feedbackViewers)
        .where(
          and(
            eq(feedbackViewers.feedbackId, fb.id),
            eq(feedbackViewers.userId, viewer.id),
          ),
        );

      if (!viewerAccess) continue;

      const responses = await this.db
        .select()
        .from(feedbackResponses)
        .where(eq(feedbackResponses.feedbackId, fb.id));

      visibleFeedback.push({ ...fb, responses });
    }

    return visibleFeedback; // returns empty array if none are visible
  }

  async getFeedbackBySender(senderId: string) {
    const feedbacks = await this.db
      .select()
      .from(performanceFeedback)
      .where(eq(performanceFeedback.senderId, senderId));

    return feedbacks;
  }

  async getResponsesForFeedback(feedbackIds: string[]) {
    return await this.db
      .select({
        feedbackId: feedbackResponses.feedbackId,
        questionId: feedbackResponses.question,
      })
      .from(feedbackResponses)
      .where(inArray(feedbackResponses.feedbackId, feedbackIds));
  }

  async findAll(
    companyId: string,
    filters?: { type?: string; departmentId?: string },
  ) {
    const conditions = [
      eq(performanceFeedback.companyId, companyId),
      // Exclude archived by default
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
      .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(users, eq(users.id, performanceFeedback.senderId));

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
    }));
  }

  /**
   * Find all performance feedback for a given employee in a company.
   * Optionally filter by type (including archived/all).
   */
  async findAllByEmployeeId(
    companyId: string,
    employeeId: string,
    filters?: { type?: string },
  ) {
    if (!employeeId) return []; // Early exit for invalid employee
    // Ensure employee exists in the company
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), eq(employees.companyId, companyId)),
      );

    console.log('Employee:', employee);

    // Base conditions: company and employee recipient
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

    // If you want additional type filtering
    const conditions = [baseCondition];

    // Further filter by feedback type if specified and not 'all' or 'archived'
    if (
      filters?.type &&
      filters.type !== 'all' &&
      filters.type !== 'archived'
    ) {
      conditions.push(eq(performanceFeedback.type, filters.type));
    }

    // Query feedbacks with joins to employee, department, jobRole, and sender
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
      .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(users, eq(users.id, performanceFeedback.senderId));

    // Fetch response counts for each feedback
    const feedbackIds = feedbacks.map((f) => f.id);
    const responses = await this.getResponsesForFeedback(feedbackIds);

    // Format results for ESS
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
  }

  async findOne(id: string, user: User) {
    const [item] = await this.db
      .select({
        id: performanceFeedback.id,
        type: performanceFeedback.type,
        createdAt: performanceFeedback.createdAt,
        isAnonymous: performanceFeedback.isAnonymous,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        senderName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(performanceFeedback)
      .where(eq(performanceFeedback.id, id))
      .leftJoin(employees, eq(employees.id, performanceFeedback.recipientId))
      .leftJoin(users, eq(users.id, performanceFeedback.senderId));

    if (!item) {
      throw new NotFoundException('Feedback not found');
    }

    // Check if user is allowed to view this feedback
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
      // 👇 Return a message if the user is neither a viewer nor an admin
      return 'You do not have permission to view this feedback';
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

    return {
      ...item,
      responses,
    };
  }

  async update(id: string, updateFeedbackDto: UpdateFeedbackDto, user: User) {
    await this.findOne(id, user);

    const [updatedFeedback] = await this.db
      .update(performanceFeedback)
      .set(updateFeedbackDto)
      .where(eq(performanceFeedback.id, id))
      .returning();

    // Log the update of feedback for auditing purposes
    await this.auditService.logAction({
      action: 'update',
      entity: 'feedback',
      entityId: updatedFeedback.id,
      userId: user.id,
      details: 'Feedback updated',
      changes: {
        ...updateFeedbackDto,
      },
    });

    return updatedFeedback[0];
  }

  async remove(id: string, user: User) {
    await this.findOne(id, user);

    const deletedFeedback = await this.db
      .update(performanceFeedback)
      .set({ isArchived: true })
      .where(eq(performanceFeedback.id, id))
      .returning();

    // Log the deletion of feedback for auditing purposes
    await this.auditService.logAction({
      action: 'delete',
      entity: 'feedback',
      entityId: id,
      userId: user.id,
      details: 'Feedback deleted',
    });

    return deletedFeedback[0];
  }
}
