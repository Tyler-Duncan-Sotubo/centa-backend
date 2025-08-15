import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { blockedLeaveDays } from './schema/blocked-day.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { and, eq, sql } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { users } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class BlockedDaysService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:leave`,
      `company:${companyId}:leave:blocked-days`,
    ];
  }

  async create(dto: CreateBlockedDayDto, user: User) {
    // Uniqueness per company + date
    const existingBlockedDay = await this.db
      .select()
      .from(blockedLeaveDays)
      .where(
        and(
          eq(blockedLeaveDays.date, dto.date),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();

    if (existingBlockedDay.length > 0) {
      throw new BadRequestException('This date is already blocked.');
    }

    const [blockedDay] = await this.db
      .insert(blockedLeaveDays)
      .values({
        ...dto,
        companyId: user.companyId,
        createdBy: user.id,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'blockedLeaveDays',
      entityId: blockedDay.id,
      userId: user.id,
      details: 'Blocked day created',
      changes: { ...dto, companyId: user.companyId },
    });

    // Invalidate all versioned keys under this company
    await this.cache.bumpCompanyVersion(user.companyId);

    return blockedDay;
  }

  async getBlockedDates(companyId: string): Promise<string[]> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'blocked-days', 'dates'],
      async () => {
        const result = (await this.db
          .select({ date: blockedLeaveDays.date })
          .from(blockedLeaveDays)
          .where(eq(blockedLeaveDays.companyId, companyId))
          .execute()) as { date: string | Date }[];

        return result.map(
          (r) =>
            (typeof r.date === 'string' ? r.date : r.date.toISOString()).split(
              'T',
            )[0],
        );
      },
      { tags: this.tags(companyId) },
    );
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'blocked-days', 'list'],
      async () => {
        return this.db
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
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'blocked-days', 'one', id],
      async () => {
        const [blockedDay] = await this.db
          .select()
          .from(blockedLeaveDays)
          .where(
            and(
              eq(blockedLeaveDays.id, id),
              eq(blockedLeaveDays.companyId, companyId),
            ),
          )
          .execute();

        if (!blockedDay) {
          throw new NotFoundException('Blocked day not found');
        }
        return blockedDay;
      },
      { tags: this.tags(companyId) },
    );
  }

  async update(id: string, dto: UpdateBlockedDayDto, user: User) {
    // Ensure it exists & belongs to company
    const [existing] = await this.db
      .select()
      .from(blockedLeaveDays)
      .where(
        and(
          eq(blockedLeaveDays.id, id),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();
    if (!existing) throw new NotFoundException('Blocked day not found');

    const [updated] = await this.db
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

    await this.auditService.logAction({
      action: 'update',
      entity: 'blockedLeaveDays',
      entityId: id,
      userId: user.id,
      details: 'Blocked day updated',
      changes: { before: existing, after: updated },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return updated;
  }

  async remove(id: string, user: User) {
    // Ensure it exists & belongs to company
    const [existing] = await this.db
      .select()
      .from(blockedLeaveDays)
      .where(
        and(
          eq(blockedLeaveDays.id, id),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();
    if (!existing) throw new NotFoundException('Blocked day not found');

    await this.db
      .delete(blockedLeaveDays)
      .where(
        and(
          eq(blockedLeaveDays.id, id),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'blockedLeaveDays',
      entityId: id,
      userId: user.id,
      details: 'Blocked day deleted',
      changes: { id, companyId: user.companyId },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return { message: 'Blocked day deleted successfully' };
  }
}
