import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { performanceCycles } from './schema/performance-cycles.schema';

@Injectable()
export class CycleService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}

  async create(
    createCycleDto: CreateCycleDto,
    companyId: string,
    userId?: string,
  ) {
    const existingCycle = await this.db
      .select()
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.name, createCycleDto.name),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .execute();

    if (existingCycle.length > 0) {
      throw new BadRequestException('Cycle with this name already exists');
    }

    const today = new Date();
    const startDate = new Date(createCycleDto.startDate);
    const endDate = new Date(createCycleDto.endDate);

    let status = 'draft';

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startDate <= today || endDate <= today) {
      status = 'active';
    }

    const [newCycle] = await this.db
      .insert(performanceCycles)
      .values({
        ...createCycleDto,
        status,
        companyId,
      })
      .returning();

    // log the creation
    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_cycle',
        entityId: newCycle.id,
        userId: userId,
        details: `Created performance cycle ${newCycle.name}`,
        changes: {
          name: newCycle.name,
          companyId: companyId,
          startDate: newCycle.startDate,
          endDate: newCycle.endDate,
          status: newCycle.status,
        },
      });
    }

    return newCycle;
  }

  async findAll(companyId: string) {
    const cycles = await this.db
      .select()
      .from(performanceCycles)
      .where(eq(performanceCycles.companyId, companyId))
      .orderBy(desc(performanceCycles.startDate))
      .execute();

    return cycles;
  }

  async findCurrent(companyId: string) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const currentCycle = await this.db
      .select()
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.companyId, companyId),
          lte(performanceCycles.startDate, todayStr),
          gte(performanceCycles.endDate, todayStr),
        ),
      )
      .orderBy(desc(performanceCycles.startDate)) // In case of overlap, get the most recent
      .limit(1)
      .execute();

    return currentCycle[0] ?? null;
  }

  async findOne(id: string) {
    const [cycle] = await this.db
      .select()
      .from(performanceCycles)
      .where(eq(performanceCycles.id, id))
      .execute();

    if (!cycle) {
      throw new NotFoundException(`Performance cycle with ID ${id} not found.`);
    }

    return cycle;
  }

  async getLastCycle(companyId: string) {
    const [lastCycle] = await this.db
      .select()
      .from(performanceCycles)
      .where(eq(performanceCycles.companyId, companyId))
      .orderBy(desc(performanceCycles.startDate))
      .limit(1)
      .execute();

    return lastCycle ?? null;
  }

  async update(id: string, updateCycleDto: UpdateCycleDto, user: User) {
    const { id: userId, companyId } = user;
    await this.findOne(id); // Ensure cycle exists before updating

    const [updatedCycle] = await this.db
      .update(performanceCycles)
      .set(updateCycleDto)
      .where(
        and(
          eq(performanceCycles.id, id),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .returning();

    // Log the update
    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_cycle',
      entityId: id,
      userId,
      details: `Updated performance cycle ${updatedCycle.name}`,
      changes: {
        ...updateCycleDto,
        id: updatedCycle.id,
        companyId: updatedCycle.companyId,
        startDate: updatedCycle.startDate,
        endDate: updatedCycle.endDate,
        status: updatedCycle.status,
        updatedAt: new Date().toISOString(), // Optional: log update time
        updatedBy: userId, // Optional: log who updated it
      },
    });

    return updatedCycle;
  }

  async remove(id: string, user: User) {
    const { id: userId, companyId } = user;

    // Ensure cycle exists before deleting
    await this.findOne(id);

    // delete the cycle
    await this.db
      .delete(performanceCycles)
      .where(
        and(
          eq(performanceCycles.id, id),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .execute();

    // Log the deletion
    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_cycle',
      entityId: id,
      userId, // No user for deletion
      details: `Deleted performance cycle with ID ${id}`,
      changes: {
        id: id,
        companyId: companyId,
        status: 'deleted', // Indicating the cycle is deleted
        deletedAt: new Date().toISOString(), // Optional: log deletion time
        deletedBy: userId, // Optional: log who deleted it
      },
    });
  }
}
