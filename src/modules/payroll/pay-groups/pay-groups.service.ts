import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { employees } from 'src/drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
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

  async findOneEmployee(employeeId: string) {
    const cacheKey = `employee_${employeeId}`;

    return this.cacheService.getOrSetCache(cacheKey, async () => {
      const [employee] = await this.db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .execute();

      if (!employee) {
        throw new BadRequestException('Employee not found');
      }

      return employee;
    });
  }

  async findAll(companyId: string) {
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
      .where(eq(payGroups.companyId, companyId))
      .execute();
  }

  async create(user: User, dto: CreatePayGroupDto, ip: string) {
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

    return newGroup;
  }

  async findOne(groupId: string) {
    const [group] = await this.db
      .select()
      .from(payGroups)
      .where(eq(payGroups.id, groupId))
      .execute();

    if (!group) {
      throw new BadRequestException('Pay group not found');
    }

    return group;
  }

  async update(
    groupId: string,
    dto: UpdatePayGroupDto,
    user: User,
    ip: string,
  ) {
    await this.findOne(groupId); // Validate existence

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

    return { message: 'Pay group updated successfully' };
  }

  async remove(groupId: string, user: any, ip: string) {
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

    return { message: 'Pay group deleted successfully' };
  }

  async findEmployeesInGroup(groupId: string) {
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

    return {
      message: `${idsArray.length} employees removed from group successfully`,
    };
  }
}
