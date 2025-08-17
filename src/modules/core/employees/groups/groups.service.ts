import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AddGroupMembersDto, CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq, and, desc, inArray, count, sql, ne } from 'drizzle-orm';
import { groupMemberships, groups } from '../schema/group.schema';
import { User } from 'src/common/types/user.type';
import { employees } from '../schema/employee.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class GroupsService {
  protected table = groups;
  protected tableMembers = groupMemberships;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is companyId or "employee:<id>" for employee-based reads
    return [
      `company:${scope}:groups`,
      `company:${scope}:groups:list`,
      `company:${scope}:groups:detail`,
      `company:${scope}:groups:members`,
    ];
  }

  /** ---------- Helpers ---------- */

  private async getGroupOrThrow(id: string) {
    const [row] = await this.db
      .select({
        id: this.table.id,
        name: this.table.name,
        companyId: this.table.companyId,
      })
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1)
      .execute();

    if (!row) throw new BadRequestException('Group not found');
    return row;
  }

  private assertSameCompany(groupCompanyId: string, userCompanyId: string) {
    if (groupCompanyId !== userCompanyId) {
      throw new BadRequestException('Group does not belong to your company');
    }
  }

  /** If enforcing “one primary team per employee”, call this BEFORE setting a new primary=true */
  private async clearOtherPrimariesForEmployee(
    tx: db,
    employeeId: string,
    exceptGroupId?: string,
  ) {
    await tx
      .update(this.tableMembers)
      .set({ isPrimary: false })
      .where(
        and(
          eq(this.tableMembers.employeeId, employeeId),
          exceptGroupId
            ? ne(this.tableMembers.groupId, exceptGroupId)
            : sql`true`,
        ),
      )
      .execute();
  }

  /** Normalize legacy payloads to members[] if you still accept employeeIds/memberIds */
  private normalizeCreateMembers(dto: CreateGroupDto) {
    // Back-compat: { employeeIds: string[] } → members: [{ employeeId }]
    if ((dto as any).employeeIds && !dto.members) {
      dto.members = (dto as any).employeeIds.map((employeeId: string) => ({
        employeeId,
      }));
    }
    return dto.members ?? [];
  }

  private normalizeAddMembers(dto: AddGroupMembersDto) {
    // Back-compat: { memberIds: string[] } → members: [{ employeeId }]
    if ((dto as any).memberIds && !(dto as any).members) {
      (dto as any).members = (dto as any).memberIds.map(
        (employeeId: string) => ({
          employeeId,
        }),
      );
    }
    return (dto as any).members ?? [];
  }

  /** ---------- Create ---------- */

  async create(createGroupDto: CreateGroupDto, user: User, ip: string) {
    const { companyId, id: userId } = user;

    // Unique per company (name)
    const [existing] = await this.db
      .select({ id: this.table.id })
      .from(this.table)
      .where(
        and(
          eq(this.table.companyId, companyId),
          eq(this.table.name, createGroupDto.name),
        ),
      )
      .limit(1)
      .execute();

    if (existing) {
      throw new BadRequestException(
        `Group with name "${createGroupDto.name}" already exists`,
      );
    }

    const membersPayload = this.normalizeCreateMembers(createGroupDto);

    const [newGroup] = await this.db
      .insert(this.table)
      .values({
        companyId,
        name: createGroupDto.name,
        slug: createGroupDto.slug,
        type: createGroupDto.type ?? 'TEAM',
        parentGroupId: createGroupDto.parentGroupId ?? null,
        location: createGroupDto.location,
        timezone: createGroupDto.timezone,
        headcountCap: createGroupDto.headcountCap ?? null,
      })
      .returning()
      .execute();

    // Upsert members in a transaction to enforce primary uniqueness if you choose to
    await this.db.transaction(async (tx) => {
      for (const m of membersPayload) {
        if (m.isPrimary) {
          await this.clearOtherPrimariesForEmployee(
            tx,
            m.employeeId,
            newGroup.id,
          );
        }

        await tx
          .insert(this.tableMembers)
          .values({
            groupId: newGroup.id,
            employeeId: m.employeeId,
            role: (m.role as any) ?? 'member',
            isPrimary: !!m.isPrimary,
            title: m.title ?? null,
            startDate: (m.startDate as any) ?? null,
            endDate: (m.endDate as any) ?? null,
            allocationPct: (m.allocationPct as any) ?? null,
          })
          .onConflictDoUpdate({
            target: [this.tableMembers.groupId, this.tableMembers.employeeId],
            set: {
              role: sql`excluded.role`,
              isPrimary: sql`excluded.is_primary`,
              title: sql`excluded.title`,
              startDate: sql`excluded.start_date`,
              endDate: sql`excluded.end_date`,
              allocationPct: sql`excluded.allocation_pct`,
              updatedAt: sql`now()`,
            },
          })
          .execute();
      }
    });

    // Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'Group',
      details: 'Created new group',
      userId,
      entityId: newGroup.id,
      ipAddress: ip,
      changes: {
        name: { before: null, after: newGroup.name },
        companyId: { before: null, after: newGroup.companyId },
      },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return newGroup;
  }

  /** ---------- Add Members (bulk upsert) ---------- */

  async addMembers(
    groupId: string,
    body: AddGroupMembersDto,
    user: User,
    ip: string,
  ) {
    const { id: userId, companyId } = user;
    const group = await this.getGroupOrThrow(groupId);
    this.assertSameCompany(group.companyId, companyId);

    const members = this.normalizeAddMembers(body);
    if (members.length === 0) {
      return { message: 'No members to add', members: [] };
    }

    await this.db.transaction(async (tx) => {
      for (const m of members) {
        if (m.isPrimary) {
          await this.clearOtherPrimariesForEmployee(tx, m.employeeId, groupId);
        }

        await tx
          .insert(this.tableMembers)
          .values({
            groupId,
            employeeId: m.employeeId,
            role: (m.role as any) ?? 'member',
            isPrimary: !!m.isPrimary,
            title: m.title ?? null,
            startDate: (m.startDate as any) ?? null,
            endDate: (m.endDate as any) ?? null,
            allocationPct: (m.allocationPct as any) ?? null,
          })
          .onConflictDoUpdate({
            target: [this.tableMembers.groupId, this.tableMembers.employeeId],
            set: {
              role: sql`excluded.role`,
              isPrimary: sql`excluded.is_primary`,
              title: sql`excluded.title`,
              startDate: sql`excluded.start_date`,
              endDate: sql`excluded.end_date`,
              allocationPct: sql`excluded.allocation_pct`,
              updatedAt: sql`now()`,
            },
          })
          .execute();
      }
    });

    await this.auditService.logAction({
      action: 'create',
      entity: 'Group',
      details: 'Added/updated members in group',
      userId,
      entityId: groupId,
      ipAddress: ip,
      changes: { members: { before: null, after: members } },
    });

    await this.cache.bumpCompanyVersion(group.companyId);

    return { message: 'Members upserted successfully', members };
  }

  /** ---------- Reads ---------- */

  // Company-scoped list
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['groups', 'list', 'all'],
      async () => {
        const rows = await this.db
          .select({
            id: this.table.id,
            name: this.table.name,
            type: this.table.type,
            parentGroupId: this.table.parentGroupId,
            createdAt: this.table.createdAt,
            members: count(this.tableMembers.groupId).as('memberCount'),

            // lead employeeId (most recent active lead)
            leadEmployeeId: sql<string | null>`
            (
              array_agg(${this.tableMembers.employeeId}
                        ORDER BY ${this.tableMembers.joinedAt} DESC)
              FILTER (WHERE ${this.tableMembers.role} = 'lead'
                          AND ${this.tableMembers.endDate} IS NULL)
            )[1]
          `.as('leadEmployeeId'),

            // lead full name (matches the chosen lead above)
            leadEmployeeName: sql<string | null>`
            (
              array_agg((${employees.firstName} || ' ' || ${employees.lastName})
                        ORDER BY ${this.tableMembers.joinedAt} DESC)
              FILTER (WHERE ${this.tableMembers.role} = 'lead'
                          AND ${this.tableMembers.endDate} IS NULL)
            )[1]
          `.as('leadEmployeeName'),
          })
          .from(this.table)
          .leftJoin(
            this.tableMembers,
            eq(this.tableMembers.groupId, this.table.id),
          )
          // left join to preserve groups with zero members
          .leftJoin(employees, eq(employees.id, this.tableMembers.employeeId))
          .where(eq(this.table.companyId, companyId))
          // (Postgres-safe) group by all non-aggregated columns from "this.table"
          .groupBy(
            this.table.id,
            this.table.name,
            this.table.type,
            this.table.parentGroupId,
            this.table.createdAt,
          )
          .orderBy(desc(this.table.createdAt))
          .execute();

        return rows;
      },
      { tags: this.tags(companyId) },
    );
  }

  // Detail with members
  async findOne(id: string) {
    const base = await this.getGroupOrThrow(id);

    return this.cache.getOrSetVersioned(
      base.companyId,
      ['groups', 'detail', id],
      async () => {
        const memberships = await this.db
          .select()
          .from(this.tableMembers)
          .where(eq(this.tableMembers.groupId, id))
          .execute();

        const memberIds = memberships.map((m) => m.employeeId);

        const employeesDetails = memberIds.length
          ? await this.db
              .select({
                id: employees.id,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
              })
              .from(employees)
              .where(inArray(employees.id, memberIds))
              .execute()
          : [];

        // decorate with membership meta (role, isPrimary, dates…)
        const members = employeesDetails.map((e) => {
          const meta = memberships.find((m) => m.employeeId === e.id)!;
          return { ...e, ...meta };
        });

        return { ...base, members };
      },
      { tags: this.tags(base.companyId) },
    );
  }

  // Groups by employee (fixed join)
  async findEmployeesGroups(employeeId: string) {
    return this.cache.getOrSetVersioned(
      `employee:${employeeId}`,
      ['groups', 'byEmployee', employeeId],
      async () => {
        const rows = await this.db
          .select({
            id: this.table.id,
            name: this.table.name,
            type: this.table.type,
            parentGroupId: this.table.parentGroupId,
            role: this.tableMembers.role,
            isPrimary: this.tableMembers.isPrimary,
            startDate: this.tableMembers.startDate,
            endDate: this.tableMembers.endDate,
            allocationPct: this.tableMembers.allocationPct,
          })
          .from(this.tableMembers)
          .innerJoin(this.table, eq(this.table.id, this.tableMembers.groupId))
          .where(eq(this.tableMembers.employeeId, employeeId))
          .execute();

        return rows;
      },
      { tags: this.tags(employeeId) },
    );
  }

  /** ---------- Update group & (optionally) members ---------- */

  async update(
    groupId: string,
    updateGroupDto: UpdateGroupDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id: userId } = user;
    const base = await this.getGroupOrThrow(groupId);
    this.assertSameCompany(base.companyId, companyId);

    // Handle member updates if provided
    const incomingMembers =
      (updateGroupDto as any).members ??
      // back-compat: employeeIds[]
      ((updateGroupDto as any).employeeIds?.map((employeeId: string) => ({
        employeeId,
      })) as any[] | undefined);

    await this.db.transaction(async (tx) => {
      if (incomingMembers && incomingMembers.length) {
        for (const m of incomingMembers) {
          if (m.isPrimary) {
            await this.clearOtherPrimariesForEmployee(
              tx,
              m.employeeId,
              groupId,
            );
          }

          await tx
            .insert(this.tableMembers)
            .values({
              groupId,
              employeeId: m.employeeId,
              role: (m.role as any) ?? 'member',
              isPrimary: !!m.isPrimary,
              title: m.title ?? null,
              startDate: (m.startDate as any) ?? null,
              endDate: (m.endDate as any) ?? null,
              allocationPct: (m.allocationPct as any) ?? null,
            })
            .onConflictDoUpdate({
              target: [this.tableMembers.groupId, this.tableMembers.employeeId],
              set: {
                role: sql`excluded.role`,
                isPrimary: sql`excluded.is_primary`,
                title: sql`excluded.title`,
                startDate: sql`excluded.start_date`,
                endDate: sql`excluded.end_date`,
                allocationPct: sql`excluded.allocation_pct`,
                updatedAt: sql`now()`,
              },
            })
            .execute();
        }
      }

      // Update group fields
      await tx
        .update(this.table)
        .set({
          name: updateGroupDto.name ?? undefined,
          slug: updateGroupDto.slug ?? undefined,
          type: (updateGroupDto.type as any) ?? undefined,
          parentGroupId:
            updateGroupDto.parentGroupId === undefined
              ? undefined
              : (updateGroupDto.parentGroupId ?? null),
          location: updateGroupDto.location ?? undefined,
          timezone: updateGroupDto.timezone ?? undefined,
          headcountCap:
            updateGroupDto.headcountCap === undefined
              ? undefined
              : (updateGroupDto.headcountCap ?? null),
          updatedAt: sql`now()`,
        })
        .where(
          and(eq(this.table.id, groupId), eq(this.table.companyId, companyId)),
        )
        .execute();
    });

    const [updatedGroup] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, groupId))
      .limit(1)
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'Group',
      details: 'Updated group',
      userId,
      entityId: groupId,
      ipAddress: ip,
      changes: {
        name: { before: base.name, after: updatedGroup?.name },
        companyId: { before: base.companyId, after: base.companyId },
      },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return updatedGroup;
  }

  /** ---------- Remove group ---------- */
  async remove(id: string, user: User) {
    const group = await this.getGroupOrThrow(id);
    // optional: auth scope via user?.companyId
    await this.db.delete(this.table).where(eq(this.table.id, id)).execute();

    await this.auditService.logAction({
      action: 'deleted',
      details: 'Deleted group',
      entity: 'Group',
      userId: user.id,
      entityId: id,
    });

    await this.cache.bumpCompanyVersion(group.companyId);
    return 'Group deleted successfully';
  }

  /** ---------- Remove members ---------- */

  async removeMembers(
    groupId: string,
    body: AddGroupMembersDto,
    user: User,
    ip: string,
  ) {
    const { id: userId, companyId } = user;
    const group = await this.getGroupOrThrow(groupId);
    this.assertSameCompany(group.companyId, companyId);

    const members = this.normalizeAddMembers(body);
    const ids = members.map((m) => m.employeeId);

    if (!ids.length) {
      return { message: 'No members to remove', members: [] };
    }

    const existing = await this.db
      .select({ employeeId: this.tableMembers.employeeId })
      .from(this.tableMembers)
      .where(
        and(
          eq(this.tableMembers.groupId, groupId),
          inArray(this.tableMembers.employeeId, ids),
        ),
      )
      .execute();

    if (existing.length === 0) {
      throw new BadRequestException(`Members do not exist in group ${groupId}`);
    }

    await this.db
      .delete(this.tableMembers)
      .where(
        and(
          eq(this.tableMembers.groupId, groupId),
          inArray(this.tableMembers.employeeId, ids),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'deleted',
      details: 'Removed members from group',
      entity: 'Group',
      userId,
      entityId: groupId,
      ipAddress: ip,
      changes: { members: { before: existing, after: ids } },
    });

    await this.cache.bumpCompanyVersion(group.companyId);

    return { message: 'Members removed successfully', members: ids };
  }
}
