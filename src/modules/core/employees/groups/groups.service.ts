import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AddGroupMembersDto, CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq, and, desc, inArray, count } from 'drizzle-orm';
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

  async create(createGroupDto: CreateGroupDto, user: User, ip: string) {
    const { companyId, id } = user;

    // check if group exists
    const [group] = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.name, createGroupDto.name),
          eq(this.table.companyId, companyId),
        ),
      )
      .execute();

    if (group) {
      throw new BadRequestException(
        `Group with name ${createGroupDto.name} already exists`,
      );
    }

    // create new group
    const [newGroup] = await this.db
      .insert(this.table)
      .values({ ...createGroupDto, companyId })
      .returning()
      .execute();

    // Add members to group
    const members = createGroupDto.employeeIds.map((employeeId) => ({
      groupId: newGroup.id,
      employeeId,
    }));
    await this.db.insert(this.tableMembers).values(members).execute();

    // log action
    await this.auditService.logAction({
      action: 'create',
      entity: 'Group',
      details: 'Created new group',
      userId: id,
      entityId: newGroup.id,
      ipAddress: ip,
      changes: {
        name: { before: null, after: newGroup.name },
        companyId: { before: null, after: newGroup.companyId },
      },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return newGroup;
  }

  async addMembers(
    groupId: string,
    employeeIds: AddGroupMembersDto,
    user: User,
    ip: string,
  ) {
    const { id } = user;
    // Check if the group exists
    const group = await this.findGroup(groupId);

    const members = employeeIds.memberIds.map((employeeId) => ({
      groupId,
      employeeId,
    }));

    // Check if the members already exist
    const existingMembers = await this.db
      .select()
      .from(this.tableMembers)
      .where(
        and(
          eq(this.tableMembers.groupId, groupId),
          eq(this.tableMembers.groupId, groupId),
          inArray(this.tableMembers.employeeId, employeeIds.memberIds),
        ),
      )
      .execute();

    if (existingMembers.length > 0) {
      throw new BadRequestException(
        `Members already exist in group ${groupId}`,
      );
    }

    await this.db.insert(this.tableMembers).values(members).execute();

    // Log action
    await this.auditService.logAction({
      action: 'create',
      entity: 'Group',
      details: 'Added members to group',
      userId: id,
      entityId: groupId,
      ipAddress: ip,
      changes: { members: { before: null, after: employeeIds } },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(group.companyId);

    return { message: 'Members added successfully', members };
  }

  // READ (cached per company)
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['groups', 'list', 'all'],
      async () => {
        const rows = await this.db
          .select({
            id: this.table.id,
            name: this.table.name,
            createdAt: this.table.createdAt,
            members: count(this.tableMembers.groupId).as('memberCount'),
          })
          .from(this.table)
          .leftJoin(
            this.tableMembers,
            eq(this.tableMembers.groupId, this.table.id),
          )
          .where(eq(this.table.companyId, companyId))
          .groupBy(this.table.id)
          .orderBy(desc(this.table.createdAt))
          .execute();

        return rows;
      },
      { tags: this.tags(companyId) },
    );
  }

  // READ (cached per company; we derive companyId via findGroup)
  async findOne(id: string) {
    const base = await this.findGroup(id); // contains companyId

    return this.cache.getOrSetVersioned(
      base.companyId,
      ['groups', 'detail', id],
      async () => {
        // Get group members
        const members = await this.db
          .select()
          .from(this.tableMembers)
          .where(eq(this.tableMembers.groupId, id))
          .execute();

        const memberIds = members.map((m) => m.employeeId);

        // Get employee details
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

        return { ...base, members: employeesDetails };
      },
      { tags: this.tags(base.companyId) },
    );
  }

  // (Optional caching) Employee groups; cached under employee scope
  async findEmployeesGroups(employeeId: string) {
    return this.cache.getOrSetVersioned(
      employeeId,
      ['groups', 'byEmployee', employeeId],
      async () => {
        const rows = await this.db
          .select({
            id: this.table.id,
            name: this.table.name,
          })
          .from(this.tableMembers)
          .innerJoin(this.table, eq(this.tableMembers.employeeId, employeeId))
          .execute();

        return rows;
      },
      { tags: this.tags(employeeId) },
    );
  }

  async update(
    groupId: string,
    updateGroupDto: UpdateGroupDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;
    // Check if the group exists
    await this.findGroup(groupId);

    const members = (updateGroupDto.employeeIds ?? []).map((employeeId) => ({
      groupId,
      employeeId,
    }));

    for (const member of members) {
      const exists = await this.db
        .select()
        .from(this.tableMembers)
        .where(
          and(
            eq(this.tableMembers.groupId, member.groupId),
            eq(this.tableMembers.employeeId, member.employeeId),
          ),
        )
        .limit(1)
        .execute();

      if (exists.length > 0) {
        await this.db
          .update(this.tableMembers)
          .set(member)
          .where(
            and(
              eq(this.tableMembers.groupId, member.groupId),
              eq(this.tableMembers.employeeId, member.employeeId),
            ),
          )
          .execute();
      } else {
        await this.db.insert(this.tableMembers).values(member).execute();
      }
    }

    // Update group
    const [updatedGroup] = await this.db
      .update(this.table)
      .set({ ...updateGroupDto })
      .where(
        and(eq(this.table.id, groupId), eq(this.table.companyId, companyId)),
      )
      .returning()
      .execute();

    // Log action
    await this.auditService.logAction({
      action: 'update',
      entity: 'Group',
      details: 'Updated group',
      userId: id,
      entityId: updatedGroup.id,
      ipAddress: ip,
      changes: {
        name: { before: null, after: updatedGroup.name },
        companyId: { before: null, after: updatedGroup.companyId },
      },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(companyId);

    return updatedGroup;
  }

  async remove(id: string) {
    // Check if the group exists
    const group = await this.findGroup(id);

    // Delete group
    await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning()
      .execute();

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(group.companyId);

    return 'Group deleted successfully';
  }

  async removeMembers(
    groupId: string,
    employeeId: AddGroupMembersDto,
    user: User,
    ip: string,
  ) {
    const { id } = user;
    // Check if the group exists
    const group = await this.findGroup(groupId);

    // Check if the members exist
    const existingMembers = await this.db
      .select()
      .from(this.tableMembers)
      .where(
        and(
          eq(this.tableMembers.groupId, groupId),
          inArray(this.tableMembers.employeeId, employeeId.memberIds),
        ),
      )
      .execute();

    if (existingMembers.length === 0) {
      throw new BadRequestException(`Members do not exist in group ${groupId}`);
    }

    // Remove members from group
    await this.db
      .delete(this.tableMembers)
      .where(
        and(
          eq(this.tableMembers.groupId, groupId),
          inArray(this.tableMembers.employeeId, employeeId.memberIds),
        ),
      )
      .execute();

    // Log action
    await this.auditService.logAction({
      action: 'deleted',
      details: 'Removed members from group',
      entity: 'Group',
      userId: id,
      entityId: groupId,
      ipAddress: ip,
      changes: { members: { before: null, after: employeeId } },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(group.companyId);

    return { message: 'Members removed successfully', members: employeeId };
  }

  private async findGroup(id: string) {
    const [group] = await this.db
      .select({
        id: this.table.id,
        name: this.table.name,
        companyId: this.table.companyId,
      })
      .from(this.table)
      .where(eq(this.table.id, id))
      .execute();

    if (!group) {
      throw new BadRequestException('Group not found');
    }

    return group;
  }
}
