import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq } from 'drizzle-orm';
import { employeeHistory } from '../schema/history.schema';

@Injectable()
export class HistoryService {
  protected table = employeeHistory;
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}
  async create(
    employeeId: string,
    dto: CreateHistoryDto,
    userId: string,
    ip: string,
  ) {
    const [created] = await this.db
      .insert(this.table)
      .values({
        employeeId,
        ...dto,
        type: dto.type as 'employment' | 'education' | 'certification',
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'Employee History',
      details: 'Created new employee history',
      userId,
      entityId: employeeId,
      ipAddress: ip,
      changes: { ...dto },
    });

    return created;
  }

  findAll(employeeId: string) {
    return this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();
  }

  async findOne(historyId: string) {
    const [history] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, historyId))
      .execute();

    if (!history) {
      return {};
    }
    return history;
  }

  async update(
    historyId: string,
    dto: UpdateHistoryDto,
    userId: string,
    ip: string,
  ) {
    // Check if Employee exists
    const [history] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, historyId))
      .execute();

    if (!history) {
      throw new NotFoundException(
        `History for employee ${historyId} not found`,
      );
    }

    if (history) {
      const [updated] = await this.db
        .update(this.table)
        .set({
          ...dto,
          type: dto.type as 'employment' | 'education' | 'certification',
        })
        .where(eq(this.table.id, historyId))
        .returning()
        .execute();

      const changes: Record<string, any> = {};
      for (const key of Object.keys(dto)) {
        const before = (history as any)[key];
        const after = (dto as any)[key];
        if (before !== after) {
          changes[key] = { before, after };
        }
      }
      if (Object.keys(changes).length) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'EmployeeHistory',
          details: 'Updated employee history',
          userId,
          entityId: historyId,
          ipAddress: ip,
          changes,
        });
      }

      return updated;
    }
  }

  async remove(historyId: string) {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, historyId))
      .returning({ id: this.table.id })
      .execute();

    if (!result.length) {
      throw new NotFoundException(
        `History for employee ${historyId} not found`,
      );
    }

    return { deleted: true, id: result[0].id };
  }
}
