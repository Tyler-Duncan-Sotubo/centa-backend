import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { employees } from 'src/drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { payGroups } from '../schema/pay-groups.schema';
import { paySchedules } from '../schema/pay-schedules.schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class PayGroupsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getCompanyIdByEmployeeId(employeeId: string): Promise<string> {
    const [row] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .execute();

    if (!row?.companyId) {
      throw new BadRequestException('Employee not found');
    }
    return row.companyId;
  }

  private async getCompanyIdByGroupId(groupId: string): Promise<string> {
    const [row] = await this.db
      .select({ companyId: payGroups.companyId })
      .from(payGroups)
      .where(eq(payGroups.id, groupId))
      .limit(1)
      .execute();

    if (!row?.companyId) {
      throw new BadRequestException('Pay group not found');
    }
    return row.companyId;
  }

  // ---------------------------------------------------------------------------
  // Reads (versioned cache)
  // ---------------------------------------------------------------------------

  async findOneEmployee(employeeId: string) {
    const companyId = await this.getCompanyIdByEmployeeId(employeeId);

    return this.cacheService.getOrSetVersioned(
      companyId,
      ['employee', 'byId', employeeId],
      async () => {
        const [employee] = await this.db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.id, employeeId))
          .execute();

        if (!employee) {
          throw new BadRequestException('Employee not found');
        }
        return employee;
      },
      {
        tags: [
          'employees',
          `company:${companyId}:employees`,
          `employee:${employeeId}`,
        ],
      },
    );
  }

  async findAll(companyId: string) {
    return this.cacheService.getOrSetVersioned(
      companyId,
      ['payGroups', 'list'],
      async () => {
        return this.db
          .select({
            id: payGroups.id,
            name: payGroups.name,
            pay_schedule_id: payGroups.payScheduleId,
            apply_nhf: payGroups.applyNhf,
            apply_pension: payGroups.applyPension,
            apply_paye: payGroups.applyPaye,
            payFrequency: paySchedules.payFrequency,
            createdAt: payGroups.createdAt,
          })
          .from(payGroups)
          .innerJoin(paySchedules, eq(payGroups.payScheduleId, paySchedules.id))
          .where(
            and(
              eq(payGroups.companyId, companyId),
              eq(payGroups.isDeleted, false),
            ),
          )
          .execute();
      },
      { tags: ['payGroups', `company:${companyId}:payGroups`] },
    );
  }

  async findOne(groupId: string) {
    const companyId = await this.getCompanyIdByGroupId(groupId);

    return this.cacheService.getOrSetVersioned(
      companyId,
      ['payGroups', 'byId', groupId],
      async () => {
        const [group] = await this.db
          .select()
          .from(payGroups)
          .where(eq(payGroups.id, groupId))
          .execute();

        if (!group) {
          throw new BadRequestException('Pay group not found');
        }
        return group;
      },
      {
        tags: [
          'payGroups',
          `company:${companyId}:payGroups`,
          `payGroup:${groupId}`,
        ],
      },
    );
  }

  async findEmployeesInGroup(groupId: string) {
    const companyId = await this.getCompanyIdByGroupId(groupId);

    return this.cacheService.getOrSetVersioned(
      companyId,
      ['payGroups', 'members', groupId],
      async () => {
        const employeesList = await this.db
          .select({
            id: employees.id,
            first_name: employees.firstName,
            last_name: employees.lastName,
          })
          .from(employees)
          .where(eq(employees.payGroupId, groupId))
          .execute();

        if (!employeesList.length) {
          throw new BadRequestException('No employees found in this group');
        }
        return employeesList;
      },
      {
        tags: [
          'payGroups',
          `company:${companyId}:payGroups`,
          `payGroup:${groupId}:members`,
        ],
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Writes (bump version + invalidate tags)
  // ---------------------------------------------------------------------------

  async create(user: User, dto: CreatePayGroupDto, ip: string) {
    // Check if pay schedule exists
    const [paySchedule] = await this.db
      .select({ id: paySchedules.id })
      .from(paySchedules)
      .where(
        and(
          eq(paySchedules.id, dto.payScheduleId),
          eq(paySchedules.companyId, user.companyId),
          eq(paySchedules.isDeleted, false),
        ),
      )
      .execute();

    if (!paySchedule) {
      throw new BadRequestException('Pay schedule not found');
    }

    // Check if pay group with same name already exists
    const existingGroup = await this.db
      .select({ id: payGroups.id })
      .from(payGroups)
      .where(
        and(
          eq(payGroups.name, dto.name.toLowerCase()),
          eq(payGroups.companyId, user.companyId),
          eq(payGroups.isDeleted, false),
        ),
      )
      .execute();

    if (existingGroup.length) {
      throw new BadRequestException('Pay group with this name already exists');
    }

    const [newGroup] = await this.db
      .insert(payGroups)
      .values({
        ...dto,
        name: dto.name.toLowerCase(),
        companyId: user.companyId,
      })
      .returning()
      .execute();

    if (dto.employees?.length) {
      await this.addEmployeesToGroup(dto.employees, newGroup.id, user, ip);
    }

    // make onboarding step complete
    await this.companySettings.setSetting(
      user.companyId,
      'onboarding_pay_group',
      true,
    );

    // Invalidate cached views for this company
    await this.cacheService.bumpCompanyVersion(user.companyId);
    await this.cacheService.invalidateTags([
      'payGroups',
      `company:${user.companyId}:payGroups`,
      `payGroup:${newGroup.id}`,
      `payGroup:${newGroup.id}:members`,
    ]);

    return newGroup;
  }

  async update(
    groupId: string,
    dto: UpdatePayGroupDto,
    user: User,
    ip: string,
  ) {
    await this.findOne(groupId); // Validate existence (cached)

    await this.db
      .update(payGroups)
      .set({ ...dto })
      .where(eq(payGroups.id, groupId))
      .execute();

    // Log Audit trail
    await this.auditService.logAction({
      action: 'update',
      entity: 'pay_group',
      entityId: groupId,
      userId: user.id,
      ipAddress: ip,
      details: `Updated pay group with ID ${groupId}`,
      changes: {
        updated: true,
        groupId,
        changes: dto,
      },
    });

    // Invalidate caches
    await this.cacheService.bumpCompanyVersion(user.companyId);
    await this.cacheService.invalidateTags([
      'payGroups',
      `company:${user.companyId}:payGroups`,
      `payGroup:${groupId}`,
      `payGroup:${groupId}:members`,
    ]);

    return { message: 'Pay group updated successfully' };
  }

  async remove(groupId: string, user: any, ip: string) {
    // ensure no employees assigned
    const employeesInGroup = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.payGroupId, groupId))
      .execute();

    if (employeesInGroup.length) {
      throw new BadRequestException(
        'Cannot delete pay group with employees assigned to it',
      );
    }

    await this.db
      .update(payGroups)
      .set({ isDeleted: true })
      .where(eq(payGroups.id, groupId))
      .returning()
      .execute();

    // Log Audit trail
    await this.auditService.logAction({
      action: 'delete',
      entity: 'pay_group',
      entityId: groupId,
      userId: user.id,
      ipAddress: ip,
      details: `Deleted pay group with ID ${groupId}`,
      changes: {
        deleted: true,
        groupId,
      },
    });

    // Invalidate caches
    await this.cacheService.bumpCompanyVersion(user.companyId);
    await this.cacheService.invalidateTags([
      'payGroups',
      `company:${user.companyId}:payGroups`,
      `payGroup:${groupId}`,
      `payGroup:${groupId}:members`,
    ]);

    return { message: 'Pay group deleted successfully' };
  }

  async addEmployeesToGroup(
    employeeIds: string[] | string,
    groupId: string,
    user: User,
    ip: string,
  ) {
    const idsArray = Array.isArray(employeeIds) ? employeeIds : [employeeIds];

    const existingEmployees = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(inArray(employees.id, idsArray))
      .execute();

    if (existingEmployees.length !== idsArray.length) {
      throw new BadRequestException('Some employees not found');
    }

    await this.db
      .update(employees)
      .set({ payGroupId: groupId })
      .where(inArray(employees.id, idsArray))
      .execute();

    // Log Audit trail
    await this.auditService.logAction({
      action: 'update',
      entity: 'pay_group',
      entityId: groupId,
      userId: user.id,
      ipAddress: ip,
      details: `Added employees to pay group with ID ${groupId}`,
      changes: {
        added: true,
        groupId,
        employeeIds: idsArray,
      },
    });

    // Invalidate caches (company + group members)
    await this.cacheService.bumpCompanyVersion(user.companyId);
    await this.cacheService.invalidateTags([
      'payGroups',
      `company:${user.companyId}:payGroups`,
      `payGroup:${groupId}`,
      `payGroup:${groupId}:members`,
    ]);

    return {
      message: `${idsArray.length} employees added to group ${groupId}`,
    };
  }

  async removeEmployeesFromGroup(
    employeeIds: string[] | string,
    user: User,
    ip: string,
  ) {
    const idsArray = Array.isArray(employeeIds) ? employeeIds : [employeeIds];

    // Find the distinct groupIds these employees currently belong to (for targeted invalidation)
    const currentGroups = await this.db
      .select({ groupId: employees.payGroupId })
      .from(employees)
      .where(inArray(employees.id, idsArray))
      .execute();

    const distinctGroupIds = Array.from(
      new Set(
        currentGroups
          .map((g) => g.groupId)
          .filter((g): g is string => Boolean(g)),
      ),
    );

    const [deleted] = await this.db
      .update(employees)
      .set({ payGroupId: null })
      .where(inArray(employees.id, idsArray))
      .returning()
      .execute();

    // Log Audit trail
    await this.auditService.logAction({
      action: 'update',
      entity: 'pay_group',
      entityId: deleted.id,
      userId: user.id,
      ipAddress: ip,
      details: `Removed employees from pay group`,
      changes: {
        removed: true,
        employeeIds: idsArray,
      },
    });

    // Invalidate caches (company + each affected group's member list)
    await this.cacheService.bumpCompanyVersion(user.companyId);
    await this.cacheService.invalidateTags([
      'payGroups',
      `company:${user.companyId}:payGroups`,
      ...distinctGroupIds.map((g) => `payGroup:${g}:members`),
      ...distinctGroupIds.map((g) => `payGroup:${g}`),
    ]);

    return {
      message: `${idsArray.length} employees removed from group successfully`,
    };
  }
}
