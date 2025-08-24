import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { employeeProfiles } from '../schema/profile.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProfileService {
  protected table = employeeProfiles;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async upsert(
    employeeId: string,
    dto: CreateProfileDto,
    userId: string,
    ip: string,
  ) {
    // Check if Employee profile exists
    const [employee] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();

    if (employee) {
      const [updated] = await this.db
        .update(this.table)
        .set({ ...dto })
        .where(eq(this.table.employeeId, employeeId))
        .returning()
        .execute();

      const changes: Record<string, any> = {};
      for (const key of Object.keys(dto)) {
        const before = (employee as any)[key];
        const after = (dto as any)[key];
        if (before !== after) {
          changes[key] = { before, after };
        }
      }
      if (Object.keys(changes).length) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'Employee Profile',
          details: 'Updated employee profile',
          userId,
          entityId: employeeId,
          ipAddress: ip,
          changes,
        });
      }

      return updated;
    } else {
      const [created] = await this.db
        .insert(this.table)
        .values({ employeeId, ...dto })
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'create',
        entity: 'Employee Profile',
        details: 'Created new employee profile',
        userId,
        entityId: employeeId,
        ipAddress: ip,
        changes: { ...dto },
      });

      return created;
    }
  }

  // READ (cached per employee)
  async findOne(employeeId: string) {
    const [profile] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();

    return profile ?? {};
  }

  async remove(employeeId: string) {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .returning({ id: this.table.id })
      .execute();

    if (!result.length) {
      throw new NotFoundException(
        `Profile for employee ${employeeId} not found`,
      );
    }

    return { deleted: true, id: result[0].id };
  }
}
