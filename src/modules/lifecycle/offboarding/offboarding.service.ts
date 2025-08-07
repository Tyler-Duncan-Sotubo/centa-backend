import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOffboardingDto } from './dto/create-offboarding.dto';
import { UpdateOffboardingDto } from './dto/update-offboarding.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
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

@Injectable()
export class OffboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  // 1. CREATE OFFBOARDING SESSION + generate checklist
  async create(createDto: CreateOffboardingDto, user: User) {
    const {
      employeeId,
      terminationType,
      terminationReason,
      notes,
      checklistItemIds,
    } = createDto;

    // 0. ensure employee is not already offboarded
    const [existingSession] = await this.db
      .select()
      .from(termination_sessions)
      .where(eq(termination_sessions.employeeId, employeeId));

    if (existingSession) {
      throw new BadRequestException(
        'An offboarding session is already in progress for this employee.',
      );
    }

    // 1. Create offboarding session
    const [session] = await this.db
      .insert(termination_sessions)
      .values({
        employeeId,
        companyId: user.companyId,
        terminationType,
        terminationReason,
        notes,
        status: 'in_progress',
        startedAt: new Date(),
      })
      .returning();

    if (!session) {
      throw new BadRequestException('Failed to create termination session');
    }

    // 2. Fetch checklist item details based on IDs
    const checklistItems = await this.db
      .select()
      .from(termination_checklist_items)
      .where(inArray(termination_checklist_items.id, checklistItemIds));

    if (checklistItems.length !== checklistItemIds.length) {
      throw new BadRequestException(
        'One or more checklist item IDs are invalid.',
      );
    }

    //find assigned assets
    const assignedAssets = await this.db
      .select()
      .from(assets)
      .where(eq(assets.employeeId, employeeId));

    // 3. Insert checklist snapshot for this session
    const finalChecklistItems = checklistItems.flatMap((item, index) => {
      if (item.isAssetReturnStep) {
        return assignedAssets.map((asset, assetIndex) => ({
          sessionId: session.id,
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
          sessionId: session.id,
          name: item.name,
          description: item.description,
          isAssetReturnStep: false,
          order: index + 1,
          completed: false,
          createdAt: new Date(),
        },
      ];
    });

    await this.db
      .insert(employee_termination_checklist)
      .values(finalChecklistItems);

    // 4. Audit the creation of the offboarding session
    await this.auditService.logAction({
      action: 'create',
      entity: 'termination_session',
      entityId: session.id,
      userId: user.id,
      details: 'Offboarding session created',
      changes: {
        sessionId: session.id,
        employeeId,
        terminationType,
        terminationReason,
        notes,
      },
    });

    return session;
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

      console.log(
        'All checklist items completed for session:',
        checklistItem.sessionId,
      );

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

    console.log(
      'All checklist items completed for session:',
      checklistItem.sessionId,
    );

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
}
