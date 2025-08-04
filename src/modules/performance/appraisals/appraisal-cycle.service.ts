import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from './dto/update-appraisal-cycle.dto';
import { performanceAppraisalCycles } from './schema/performance-appraisal-cycle.schema';

@Injectable()
export class AppraisalCycleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createDto: CreateAppraisalCycleDto,
    companyId: string,
    userId?: string,
  ) {
    const existing = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.name, createDto.name),
          eq(performanceAppraisalCycles.companyId, companyId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException('Appraisal cycle name already exists');
    }

    const [created] = await this.db
      .insert(performanceAppraisalCycles)
      .values({
        ...createDto,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        companyId,
      })
      .returning();

    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_appraisal_cycle',
        entityId: created.id,
        userId,
        details: `Created appraisal cycle ${created.name}`,
        changes: {
          name: created.name,
          companyId,
          startDate: created.startDate,
          endDate: created.endDate,
          status: created.status,
        },
      });
    }

    return created;
  }

  async findAll(companyId: string) {
    const appraisalCycles = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(eq(performanceAppraisalCycles.companyId, companyId))
      .orderBy(asc(performanceAppraisalCycles.startDate))
      .execute();

    const today = new Date().toISOString();
    const currentCycle = appraisalCycles.find(
      (cycle) =>
        cycle.startDate <= today &&
        cycle.endDate >= today &&
        cycle.companyId === companyId,
    );

    return appraisalCycles.map((cycle) => ({
      ...cycle,
      status: cycle.id === currentCycle?.id ? 'active' : 'upcoming',
    }));
  }

  async getLastCycle(companyId: string) {
    const [lastCycle] = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(eq(performanceAppraisalCycles.companyId, companyId))
      .orderBy(desc(performanceAppraisalCycles.startDate))
      .limit(1)
      .execute();

    return lastCycle ?? null;
  }

  async findCurrent(companyId: string) {
    const today = new Date().toISOString();

    const current = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.companyId, companyId),
          lte(performanceAppraisalCycles.startDate, today),
          gte(performanceAppraisalCycles.endDate, today),
        ),
      )
      .orderBy(desc(performanceAppraisalCycles.startDate))
      .limit(1)
      .execute();

    return current[0] ?? null;
  }

  async findOne(id: string, companyId: string) {
    const [cycle] = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.id, id),
          eq(performanceAppraisalCycles.companyId, companyId),
        ),
      )
      .execute();

    if (!cycle) {
      throw new NotFoundException(`Appraisal cycle with ID ${id} not found`);
    }

    const today = new Date().toISOString();
    const isActive = cycle.startDate <= today && cycle.endDate >= today;
    cycle.status = isActive ? 'active' : 'upcoming';

    return cycle;
  }

  async getLast(companyId: string) {
    const [last] = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(eq(performanceAppraisalCycles.companyId, companyId))
      .orderBy(desc(performanceAppraisalCycles.startDate))
      .limit(1)
      .execute();

    return last ?? null;
  }

  async update(id: string, updateDto: UpdateAppraisalCycleDto, user: User) {
    await this.findOne(id, user.companyId);

    const [updated] = await this.db
      .update(performanceAppraisalCycles)
      .set({
        ...updateDto,
        startDate: updateDto.startDate,
        endDate: updateDto.endDate,
      })
      .where(
        and(
          eq(performanceAppraisalCycles.id, id),
          eq(performanceAppraisalCycles.companyId, user.companyId),
        ),
      )
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_appraisal_cycle',
      entityId: id,
      userId: user.id,
      details: `Updated appraisal cycle ${updated.name}`,
      changes: {
        ...updateDto,
        updatedAt: new Date().toISOString(),
      },
    });

    return updated;
  }

  async remove(id: string, user: User) {
    const { companyId, id: userId } = user;

    await this.findOne(id, companyId);

    await this.db
      .delete(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.id, id),
          eq(performanceAppraisalCycles.companyId, companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_appraisal_cycle',
      entityId: id,
      userId,
      details: `Deleted appraisal cycle ${id}`,
      changes: {
        deletedAt: new Date().toISOString(),
      },
    });

    return { message: 'Cycle deleted successfully' };
  }
}
