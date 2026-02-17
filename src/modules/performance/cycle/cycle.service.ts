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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CycleService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [`company:${companyId}:performance-cycles`];
  }

  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
  }

  /**
   * ---------------------------------------------------
   * FIND BY NAME (used by cron)
   * ---------------------------------------------------
   */
  async findByName(companyId: string, name: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['performance-cycles', 'by-name', name],
      async () => {
        const [cycle] = await this.db
          .select()
          .from(performanceCycles)
          .where(
            and(
              eq(performanceCycles.companyId, companyId),
              eq(performanceCycles.name, name),
            ),
          )
          .limit(1)
          .execute();

        return cycle ?? null;
      },
      { tags: this.tags(companyId) },
    );
  }

  /**
   * ---------------------------------------------------
   * OVERLAP CHECK
   * ---------------------------------------------------
   */
  private async hasOverlap(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    const rows = await this.db
      .select()
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.companyId, companyId),
          lte(performanceCycles.startDate, endDate),
          gte(performanceCycles.endDate, startDate),
        ),
      )
      .limit(1)
      .execute();

    return rows.length > 0;
  }

  async create(
    createCycleDto: CreateCycleDto,
    companyId: string,
    userId?: string,
  ) {
    /**
     * Duplicate name guard
     */
    const existing = await this.findByName(companyId, createCycleDto.name);
    if (existing) {
      throw new BadRequestException('Cycle with this name already exists');
    }

    /**
     * Overlap guard
     */
    const overlap = await this.hasOverlap(
      companyId,
      createCycleDto.startDate,
      createCycleDto.endDate,
    );
    if (overlap) {
      throw new BadRequestException('Cycle overlaps an existing period');
    }

    const today = new Date();
    const startDate = new Date(createCycleDto.startDate);
    const endDate = new Date(createCycleDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    let status = 'draft';
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
      .returning()
      .execute();

    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_cycle',
        entityId: newCycle.id,
        userId,
        details: `Created performance cycle ${newCycle.name}`,
        changes: {
          name: newCycle.name,
          companyId,
          startDate: newCycle.startDate,
          endDate: newCycle.endDate,
          status: newCycle.status,
        },
      });
    }

    await this.invalidate(companyId);
    return newCycle;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['performance-cycles', 'all'],
      async () =>
        this.db
          .select()
          .from(performanceCycles)
          .where(eq(performanceCycles.companyId, companyId))
          .orderBy(desc(performanceCycles.startDate))
          .execute(),
      { tags: this.tags(companyId) },
    );
  }

  async findCurrent(companyId: string) {
    const todayStr = new Date().toISOString().slice(0, 10);

    return this.cache.getOrSetVersioned(
      companyId,
      ['performance-cycles', 'current'],
      async () => {
        const rows = await this.db
          .select()
          .from(performanceCycles)
          .where(
            and(
              eq(performanceCycles.companyId, companyId),
              lte(performanceCycles.startDate, todayStr),
              gte(performanceCycles.endDate, todayStr),
            ),
          )
          .orderBy(desc(performanceCycles.startDate))
          .limit(1)
          .execute();
        return rows[0] ?? null;
      },
      { tags: this.tags(companyId) },
    );
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

  async findOneScoped(companyId: string, id: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['performance-cycles', 'one', id],
      async () => {
        const [cycle] = await this.db
          .select()
          .from(performanceCycles)
          .where(
            and(
              eq(performanceCycles.id, id),
              eq(performanceCycles.companyId, companyId),
            ),
          )
          .execute();

        if (!cycle) {
          throw new NotFoundException(
            `Performance cycle with ID ${id} not found.`,
          );
        }
        return cycle;
      },
      { tags: this.tags(companyId) },
    );
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

    await this.findOneScoped(companyId, id);

    const [updatedCycle] = await this.db
      .update(performanceCycles)
      .set(updateCycleDto)
      .where(
        and(
          eq(performanceCycles.id, id),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_cycle',
      entityId: id,
      userId,
      details: `Updated performance cycle ${updatedCycle.name}`,
      changes: updateCycleDto,
    });

    await this.invalidate(companyId);
    return updatedCycle;
  }

  async remove(id: string, user: User) {
    const { id: userId, companyId } = user;

    await this.findOneScoped(companyId, id);

    await this.db
      .delete(performanceCycles)
      .where(
        and(
          eq(performanceCycles.id, id),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_cycle',
      entityId: id,
      userId,
      details: `Deleted performance cycle ${id}`,
    });

    await this.invalidate(companyId);
  }
}
