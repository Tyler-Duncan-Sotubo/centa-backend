import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { blockedLeaveDays } from './schema/blocked-day.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { and, eq, sql } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { users } from 'src/drizzle/schema';

@Injectable()
export class BlockedDaysService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateBlockedDayDto, user: User) {
    // Check if the date is already blocked
    const existingBlockedDay = await this.db
      .select()
      .from(blockedLeaveDays)
      .where(eq(blockedLeaveDays.date, dto.date))
      .execute();

    if (existingBlockedDay.length > 0) {
      throw new BadRequestException('This date is already blocked.');
    }

    // Create a new blocked day
    const blockedDay = await this.db
      .insert(blockedLeaveDays)
      .values({
        ...dto,
        companyId: user.companyId,
        createdBy: user.id,
      })
      .returning()
      .execute();

    // Log the creation of the blocked day
    await this.auditService.logAction({
      action: 'create',
      entity: 'blockedLeaveDays',
      entityId: blockedDay[0].id, // Assuming the ID is returned in the first element
      userId: user.id, // Assuming you have a userId in the DTO
      details: 'Blocked day created',
      changes: JSON.stringify(dto),
    });

    return blockedDay;
  }

  async getBlockedDates(companyId: string): Promise<string[]> {
    const result = await this.db
      .select({ date: blockedLeaveDays.date })
      .from(blockedLeaveDays)
      .where(eq(blockedLeaveDays.companyId, companyId))
      .execute();

    return result.map((r) => r.date.toString().split('T')[0]);
  }

  async findAll(companyId: string) {
    const blockedDays = await this.db
      .select({
        id: blockedLeaveDays.id,
        date: blockedLeaveDays.date,
        reason: blockedLeaveDays.reason,
        createdAt: blockedLeaveDays.createdAt,
        createdBy: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        name: blockedLeaveDays.name,
      })
      .from(blockedLeaveDays)
      .innerJoin(users, eq(users.id, blockedLeaveDays.createdBy))
      .where(eq(blockedLeaveDays.companyId, companyId))
      .execute();

    return blockedDays;
  }

  async findOne(id: string) {
    const [blockedDay] = await this.db
      .select()
      .from(blockedLeaveDays)
      .where(eq(blockedLeaveDays.id, id))
      .execute();

    if (!blockedDay) {
      throw new BadRequestException('Blocked day not found');
    }
    return blockedDay;
  }

  async update(id: string, dto: UpdateBlockedDayDto, user: User) {
    const blockedDay = await this.db
      .update(blockedLeaveDays)
      .set(dto)
      .where(
        and(
          eq(blockedLeaveDays.id, id),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    // Log the update of the blocked day
    await this.auditService.logAction({
      action: 'update',
      entity: 'blockedLeaveDays',
      entityId: id,
      userId: user.id, // Assuming you have a userId in the DTO
      details: 'Blocked day updated',
      changes: JSON.stringify(dto),
    });

    return blockedDay;
  }

  async remove(id: string) {
    // Check if the blocked day exists
    await this.findOne(id);
    return this.db
      .delete(blockedLeaveDays)
      .where(eq(blockedLeaveDays.id, id))
      .execute();
  }
}
