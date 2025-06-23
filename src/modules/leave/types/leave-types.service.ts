import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { leaveTypes } from '../schema/leave-types.schema';
import { User } from 'src/common/types/user.type';
import { and, eq, inArray } from 'drizzle-orm';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { leavePolicies } from '../schema/leave-policies.schema';

@Injectable()
export class LeaveTypesService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}

  async bulkCreateLeaveTypes(companyId: string, rows: any[]) {
    // 1) Map and validate to DTOs
    const dtos: CreateLeaveTypeDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateLeaveTypeDto, {
        name: row['Name'] || row['name'],
        isPaid:
          row['IsPaid'] !== undefined
            ? row['IsPaid'] === 'true' || row['IsPaid'] === true
            : undefined,
        colorTag: row['ColorTag'] || row['colorTag'],
      });

      const errs = await validate(dto);
      if (errs.length) {
        throw new BadRequestException(
          'Invalid CSV format or data: ' + JSON.stringify(errs),
        );
      }

      dtos.push(dto);
    }

    // 2) Check for duplicates by name
    const names = dtos.map((d) => d.name);
    const duplicates = await this.db
      .select({ name: leaveTypes.name })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          inArray(leaveTypes.name, names),
        ),
      )
      .execute();

    if (duplicates.length) {
      const duplicateNames = duplicates.map((d) => d.name);
      throw new BadRequestException(
        `Leave type names already exist: ${duplicateNames.join(', ')}`,
      );
    }

    // 3) Insert in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        name: d.name,
        isPaid: d.isPaid ?? false,
        colorTag: d.colorTag || null,
      }));

      const result = await trx
        .insert(leaveTypes)
        .values(values)
        .returning({
          id: leaveTypes.id,
          name: leaveTypes.name,
          isPaid: leaveTypes.isPaid,
          colorTag: leaveTypes.colorTag,
        })
        .execute();

      return result;
    });

    return inserted;
  }

  async create(dto: CreateLeaveTypeDto, user: User, ip: string) {
    // 1. Check if leave type already exists
    const existingLeaveType = await this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, user.companyId),
          eq(leaveTypes.name, dto.name),
        ),
      )
      .execute();

    if (existingLeaveType.length > 0) {
      throw new NotFoundException(
        `Leave type with name ${dto.name} already exists`,
      );
    }

    const { companyId, id } = user;
    //  2. Create leave type
    const leaveType = await this.db
      .insert(leaveTypes)
      .values({
        companyId,
        name: dto.name,
        isPaid: dto.isPaid,
        colorTag: dto.colorTag,
      })
      .returning()
      .execute();

    // 3. Create audit record
    await this.auditService.logAction({
      action: 'create',
      entity: 'leave',
      entityId: leaveType[0].id,
      details: 'Created new leave type',
      userId: id,
      ipAddress: ip,
      changes: {
        name: dto.name,
        isPaid: dto.isPaid,
        colorTag: dto.colorTag,
      },
    });

    return leaveType[0];
  }

  async findAll(companyId: string) {
    return this.db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.companyId, companyId))
      .execute();
  }

  async findOne(companyId: string, leaveTypeId: string) {
    // 1. Fetch leave type
    const leaveType = await this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, leaveTypeId),
        ),
      )
      .execute();

    if (leaveType.length === 0) {
      throw new NotFoundException(
        `Leave type with ID ${leaveTypeId} not found`,
      );
    }

    // 2. Return leave type
    return leaveType[0];
  }

  async update(
    leaveTypeId: string,
    dto: UpdateLeaveTypeDto,
    user: User,
    ip: string,
  ) {
    const { companyId, id } = user;
    // check if leave type exists
    const leaveType = await this.findOne(companyId, leaveTypeId);

    await this.db
      .update(leaveTypes)
      .set({
        name: dto.name ?? leaveType.name,
        isPaid: dto.isPaid ?? leaveType.isPaid,
        colorTag: dto.colorTag ?? leaveType.colorTag,
      })
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, leaveTypeId),
        ),
      )
      .execute();

    // 2. Create audit record
    await this.auditService.logAction({
      action: 'update',
      entity: 'leave',
      entityId: leaveTypeId,
      userId: id,
      details: 'Updated leave type',
      ipAddress: ip,
      changes: {
        name: dto.name,
        isPaid: dto.isPaid,
        colorTag: dto.colorTag,
      },
    });
    return this.findOne(companyId, leaveTypeId);
  }

  async remove(companyId: string, leaveTypeId: string) {
    // Ensure the leave type exists
    await this.findOne(companyId, leaveTypeId);

    // Check if there are any policies using this leave type
    const policyExists = await this.db
      .select()
      .from(leavePolicies)
      .where(eq(leavePolicies.leaveTypeId, leaveTypeId))
      .execute();

    if (policyExists && policyExists.length > 0) {
      throw new BadRequestException(
        "Cannot delete leave type: it's used by one or more leave policies.",
      );
    }

    // Safe to delete
    await this.db
      .delete(leaveTypes)
      .where(
        and(
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, leaveTypeId),
        ),
      )
      .execute();

    return { success: true, message: 'Leave type deleted successfully' };
  }
}
