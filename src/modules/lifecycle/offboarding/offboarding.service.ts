import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOffboardingBeginDto } from './dto/create-offboarding.dto';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq, inArray, sql, and, desc } from 'drizzle-orm';
import {
  employee_termination_checklist,
  termination_sessions,
} from './schema/termination-sessions.schema';
import { termination_checklist_items } from './schema/termination-checklist-items.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { assets } from 'src/modules/assets/schema/assets.schema';
import {
  departments,
  employees,
  jobRoles,
  termination_reasons,
  termination_types,
} from 'src/drizzle/schema';
import { AddOffboardingDetailsDto } from './dto/add-offboarding-details.dto';

@Injectable()
export class OffboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  // 1. CREATE OFFBOARDING SESSION + generate checklist
  async begin(createDto: CreateOffboardingBeginDto, user: User) {
    const {
      employeeId,
      terminationType,
      terminationReason,
      terminationDate,
      eligibleForRehire,
    } = createDto;

    // ensure no session already exists
    const [existingSession] = await this.db
      .select()
      .from(termination_sessions)
      .where(eq(termination_sessions.employeeId, employeeId));

    if (existingSession) {
      throw new BadRequestException(
        'An offboarding session is already in progress for this employee.',
      );
    }

    const [session] = await this.db
      .insert(termination_sessions)
      .values({
        employeeId,
        companyId: user.companyId,
        terminationType,
        terminationReason,
        terminationDate,
        eligibleForRehire: eligibleForRehire ?? true,
        status: 'pending',
        startedAt: new Date(),
      })
      .returning();

    if (!session) {
      throw new BadRequestException('Failed to create termination session');
    }

    await this.auditService.logAction({
      action: 'create',
      entity: 'termination_session',
      entityId: session.id,
      userId: user.id,
      details: 'Offboarding session begun',
      changes: {
        sessionId: session.id,
        employeeId,
        terminationType,
        terminationReason,
        terminationDate,
        eligibleForRehire: session.eligibleForRehire,
      },
    });

    return session;
  }

  // 2) ADD DETAILS — checklist snapshot + notes (later step)
  async addDetails(
    sessionId: string,
    dto: AddOffboardingDetailsDto,
    user: User,
  ) {
    const { checklistItemIds, notes } = dto;

    // session must exist and be in_progress
    const [session] = await this.db
      .select()
      .from(termination_sessions)
      .where(eq(termination_sessions.id, sessionId));

    if (!session) throw new NotFoundException('Termination session not found.');

    if (session.status !== 'pending') {
      throw new BadRequestException(
        'Cannot modify a non-active termination session.',
      );
    }

    // prevent double-adding checklist
    const existingChecks = await this.db
      .select()
      .from(employee_termination_checklist)
      .where(eq(employee_termination_checklist.sessionId, sessionId));
    if (existingChecks.length > 0) {
      throw new BadRequestException(
        'Checklist already added for this session.',
      );
    }

    // fetch checklist definitions
    const checklistItems = await this.db
      .select()
      .from(termination_checklist_items)
      .where(inArray(termination_checklist_items.id, checklistItemIds));

    if (checklistItems.length !== checklistItemIds.length) {
      throw new BadRequestException(
        'One or more checklist item IDs are invalid.',
      );
    }

    // employee's assigned assets (for dynamic steps)
    const assignedAssets = await this.db
      .select()
      .from(assets)
      .where(eq(assets.employeeId, session.employeeId));

    // build snapshot
    const finalChecklistItems = checklistItems.flatMap((item, index) => {
      if (item.isAssetReturnStep) {
        return assignedAssets.map((asset, assetIndex) => ({
          sessionId,
          name: `Return: ${asset.name}`,
          description: `Return assigned asset: ${asset.name} (${asset.internalId})`,
          isAssetReturnStep: true,
          assetId: asset.id,
          order: index + assetIndex + 1,
          completed: false,
          createdAt: new Date(),
        }));
      }

      return [
        {
          sessionId,
          name: item.name,
          description: item.description,
          isAssetReturnStep: false,
          order: index + 1,
          completed: false,
          createdAt: new Date(),
        },
      ];
    });

    if (finalChecklistItems.length) {
      await this.db
        .insert(employee_termination_checklist)
        .values(finalChecklistItems);
    }

    // attach notes (optional)
    if (typeof notes === 'string' && notes.trim().length) {
      await this.db
        .update(termination_sessions)
        .set({ notes })
        .where(eq(termination_sessions.id, sessionId));
    }

    // update session status to in_progress
    await this.db
      .update(termination_sessions)
      .set({ status: 'in_progress' })
      .where(eq(termination_sessions.id, sessionId));

    await this.auditService.logAction({
      action: 'update',
      entity: 'termination_session',
      entityId: sessionId,
      userId: user.id,
      details: 'Offboarding details added (checklist & notes)',
      changes: {
        checklistItemIds,
        hasNotes: !!notes,
      },
    });

    return { sessionId, checklistCount: finalChecklistItems.length };
  }

  async findByEmployeeId(employeeId: string, companyId: string) {
    const rows = await this.db
      .select({
        id: termination_sessions.id,
        employeeId: termination_sessions.employeeId,
        companyId: termination_sessions.companyId,

        // use the joined table names
        terminationType: termination_types.name,
        terminationReason: termination_reasons.name,

        terminationDate: termination_sessions.terminationDate,
        eligibleForRehire: termination_sessions.eligibleForRehire,
        status: termination_sessions.status,
        startedAt: termination_sessions.startedAt,
        completedAt: termination_sessions.completedAt,
        notes: termination_sessions.notes,

        // concat first and last name
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(termination_sessions)
      .innerJoin(employees, eq(employees.id, termination_sessions.employeeId))
      .innerJoin(
        termination_types,
        eq(termination_types.id, termination_sessions.terminationType),
      )
      .innerJoin(
        termination_reasons,
        eq(termination_reasons.id, termination_sessions.terminationReason),
      )
      .where(
        and(
          eq(termination_sessions.employeeId, employeeId),
          eq(termination_sessions.companyId, companyId),
        ),
      )
      .orderBy(desc(termination_sessions.startedAt))
      .limit(1);

    const session = rows[0];
    if (!session) {
      throw new BadRequestException(
        'Termination session not found for employee',
      );
    }

    return session; // now includes human-readable terminationType and terminationReason
  }

  // 2. GET ALL SESSIONS
  async findAll(companyId: string) {
    const sessions = await this.db
      .select({
        id: termination_sessions.id,
        status: termination_sessions.status,
        employeeId: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        jobRole: jobRoles.title,
        department: departments.name,
        terminationType: termination_types.name,
        terminationReason: termination_reasons.name,
      })
      .from(termination_sessions)
      .leftJoin(employees, eq(employees.id, termination_sessions.employeeId))
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .leftJoin(
        termination_types,
        eq(termination_types.id, termination_sessions.terminationType),
      )
      .leftJoin(
        termination_reasons,
        eq(termination_reasons.id, termination_sessions.terminationReason),
      )
      .where(eq(termination_sessions.companyId, companyId));

    const checklistMap = await this.db
      .select({
        sessionId: employee_termination_checklist.sessionId,
        name: employee_termination_checklist.name,
        completed: employee_termination_checklist.completed,
        itemId: employee_termination_checklist.id,
      })
      .from(employee_termination_checklist);

    const groupedChecklist = checklistMap.reduce(
      (acc, item) => {
        if (!acc[item.sessionId]) acc[item.sessionId] = [];
        acc[item.sessionId].push({
          name: item.name,
          completed: item.completed ?? false,
          id: item.itemId,
        });
        return acc;
      },
      {} as Record<string, { name: string; completed: boolean; id: string }[]>,
    );

    return sessions.map((session) => {
      const checklist = groupedChecklist[session.id] ?? [];
      const total = checklist.length;
      const completed = checklist.filter((i) => i.completed).length;

      return {
        id: session.id,
        employeeName: `${session.firstName} ${session.lastName}`,
        jobRole: session.jobRole || null,
        department: session.department || null,
        terminationType: session.terminationType || null,
        terminationReason: session.terminationReason || null,
        status: session.status,
        checklist,
        progress: {
          completed,
          total,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      };
    });
  }

  // 3. GET A SINGLE SESSION WITH CHECKLIST
  async findOne(id: string, companyId: string) {
    const session = await this.db.query.termination_sessions.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, id), eq(t.companyId, companyId)),
    });

    if (!session) {
      throw new BadRequestException('Termination session not found');
    }

    const checklist =
      await this.db.query.employee_termination_checklist.findMany({
        where: (c, { eq }) => eq(c.sessionId, id),
        orderBy: (c, { asc }) => asc(c.order),
      });

    return {
      ...session,
      checklist,
    };
  }

  // 4. UPDATE A SESSION (mainly notes or reason)
  async update(id: string, dto: UpdateOffboardingDto, user: User) {
    const updated = await this.db
      .update(termination_sessions)
      .set({
        ...dto,
      })
      .where(eq(termination_sessions.id, id))
      .returning();

    if (!updated.length) {
      throw new BadRequestException('Session not found');
    }

    // Audit the update
    await this.auditService.logAction({
      action: 'update',
      entity: 'termination_session',
      entityId: id,
      userId: user.id,
      details: 'Offboarding session updated',
      changes: {
        sessionId: id,
        ...dto,
      },
    });

    return updated[0];
  }

  // 5. REMOVE SESSION
  async remove(id: string, user: User) {
    const session = await this.db.query.termination_sessions.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    if (!session) {
      throw new BadRequestException('Termination session not found');
    }

    await this.db
      .delete(termination_sessions)
      .where(eq(termination_sessions.id, id));

    // Audit the deletion
    await this.auditService.logAction({
      action: 'delete',
      entity: 'termination_session',
      entityId: id,
      userId: user.id,
      details: 'Offboarding session deleted',
      changes: {
        sessionId: id,
      },
    });

    return { message: 'Session deleted' };
  }

  async updateChecklist(checklistItemId: string, user: User) {
    // 1. Find the checklist item
    const [checklistItem] = await this.db
      .update(employee_termination_checklist)
      .set({
        completed: true,
        completedAt: new Date(),
      })
      .where(eq(employee_termination_checklist.id, checklistItemId))
      .returning();

    if (!checklistItem) {
      throw new BadRequestException('Checklist item not found');
    }

    // 2. Check if all items in the session are now completed
    const sessionChecklist = await this.db
      .select({
        completed: employee_termination_checklist.completed,
      })
      .from(employee_termination_checklist)
      .where(
        eq(employee_termination_checklist.sessionId, checklistItem.sessionId),
      );

    const allCompleted = sessionChecklist.every((item) => item.completed);

    // 3. If all checklist items are completed, mark session as completed
    if (allCompleted) {
      const session = await this.db.query.termination_sessions.findFirst({
        where: (s, { eq }) => eq(s.id, checklistItem.sessionId),
      });

      if (!session) {
        throw new BadRequestException('Termination session not found');
      }

      const employeeId = session.employeeId;

      await this.db
        .update(termination_sessions)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(termination_sessions.id, checklistItem.sessionId));

      // make the employee inactive
      await this.db
        .update(employees)
        .set({
          employmentStatus: 'inactive',
        })
        .where(eq(employees.id, employeeId));
    }

    // 4. Audit log
    await this.auditService.logAction({
      action: 'update',
      entity: 'termination_checklist_item',
      entityId: checklistItemId,
      userId: user.id,
      details: `Checklist item marked as completed`,
      changes: {
        checklistItemId,
        completed: true,
      },
    });

    return {
      message: 'Checklist item marked as completed',
      sessionCompleted: allCompleted,
    };
  }

  async cancel(sessionId: string, user: User) {
    return this.db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(termination_sessions)
        .where(eq(termination_sessions.id, sessionId));

      if (!session)
        throw new NotFoundException('Termination session not found.');
      if (session.status !== 'pending') {
        throw new BadRequestException(
          'Only pending sessions can be cancelled.',
        );
      }

      // Audit snapshot BEFORE delete
      await this.auditService.logAction({
        action: 'delete',
        entity: 'termination_session',
        entityId: sessionId,
        userId: user.id,
        details: 'Termination session cancelled (hard delete)',
        changes: { session },
      });

      // Delete dependent rows first
      await tx
        .delete(employee_termination_checklist)
        .where(eq(employee_termination_checklist.sessionId, sessionId));

      // If you have other dependents (notes table, emails queue, etc.), delete them here…

      // Finally delete the session
      await tx
        .delete(termination_sessions)
        .where(eq(termination_sessions.id, sessionId));

      return { deleted: true, sessionId };
    });
  }
}
