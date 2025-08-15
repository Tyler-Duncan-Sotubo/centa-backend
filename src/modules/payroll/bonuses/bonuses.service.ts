import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and } from 'drizzle-orm';

import { AuditService } from 'src/modules/audit/audit.service';
import { CacheService } from 'src/common/cache/cache.service';

import { User } from 'src/common/types/user.type';
import { employees } from 'src/drizzle/schema';
import { payrollBonuses } from '../schema/payroll-bonuses.schema';

import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';

@Injectable()
export class BonusesService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
    private cache: CacheService,
  ) {}

  // -------------------------------------------------------
  // helpers
  // -------------------------------------------------------
  private async getCompanyIdByBonusId(bonusId: string): Promise<string> {
    const [row] = await this.db
      .select({ companyId: payrollBonuses.companyId })
      .from(payrollBonuses)
      .where(eq(payrollBonuses.id, bonusId))
      .limit(1)
      .execute();

    if (!row?.companyId) throw new NotFoundException('Bonus not found');
    return row.companyId;
  }

  // -------------------------------------------------------
  // create
  // -------------------------------------------------------
  async create(user: User, dto: CreateBonusDto) {
    const result = await this.db
      .insert(payrollBonuses)
      .values({
        bonusType: dto.bonusType,
        companyId: user.companyId,
        createdBy: user.id,
        effectiveDate: dto.effectiveDate,
        amount: dto.amount,
        employeeId: dto.employeeId,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      userId: user.id,
      action: 'create',
      entity: 'payroll_bonuses',
      details: 'Created a bonus',
      entityId: result[0].id,
      changes: {
        bonusType: dto.bonusType,
        amount: dto.amount,
        employeeId: dto.employeeId,
        effectiveDate: dto.effectiveDate,
      },
    });

    // Invalidate caches (version bump + tag sets)
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      'bonuses:active',
      `employee:${dto.employeeId}:bonuses`,
    ]);

    return result;
  }

  // -------------------------------------------------------
  // read
  // -------------------------------------------------------
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['bonuses', 'active'],
      async () => {
        return await this.db
          .select({
            id: payrollBonuses.id,
            employee_id: payrollBonuses.employeeId,
            amount: payrollBonuses.amount,
            bonus_type: payrollBonuses.bonusType,
            first_name: employees.firstName,
            last_name: employees.lastName,
            effective_date: payrollBonuses.effectiveDate,
            status: payrollBonuses.status,
          })
          .from(payrollBonuses)
          .where(
            and(
              eq(payrollBonuses.companyId, companyId),
              eq(payrollBonuses.status, 'active'),
            ),
          )
          .leftJoin(employees, eq(payrollBonuses.employeeId, employees.id))
          .execute();
      },
      { tags: ['bonuses:active'] },
    );
  }

  async findOne(bonusId: string) {
    const companyId = await this.getCompanyIdByBonusId(bonusId);
    return this.cache.getOrSetVersioned(
      companyId,
      ['bonus', bonusId],
      async () => {
        const result = await this.db
          .select({})
          .from(payrollBonuses)
          .where(eq(payrollBonuses.id, bonusId))
          .execute();

        if (result.length === 0) {
          throw new NotFoundException('Bonus not found');
        }
        return result;
      },
      { tags: [`bonus:${bonusId}`] },
    );
  }

  async findAllEmployeeBonuses(companyId: string, employee_id: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['employee', employee_id, 'bonuses', 'active'],
      async () => {
        return await this.db
          .select({
            id: payrollBonuses.id,
            employee_id: payrollBonuses.employeeId,
            amount: payrollBonuses.amount,
            bonus_type: payrollBonuses.bonusType,
            effective_date: payrollBonuses.effectiveDate,
          })
          .from(payrollBonuses)
          .where(
            and(
              eq(payrollBonuses.companyId, companyId),
              eq(payrollBonuses.employeeId, employee_id),
              eq(payrollBonuses.status, 'active'),
            ),
          )
          .execute();
      },
      { tags: ['bonuses:active', `employee:${employee_id}:bonuses`] },
    );
  }

  // -------------------------------------------------------
  // update
  // -------------------------------------------------------
  async update(bonusId: string, dto: UpdateBonusDto, user: User) {
    await this.findOne(bonusId); // ensures existence & throws otherwise

    const [updated] = await this.db
      .update(payrollBonuses)
      .set({
        amount: dto.amount,
        bonusType: dto.bonusType,
      })
      .where(eq(payrollBonuses.id, bonusId))
      .returning()
      .execute();

    await this.auditService.logAction({
      userId: user.id,
      action: 'update',
      entity: 'payroll_bonuses',
      details: 'Updated a bonus',
      entityId: bonusId,
      changes: {
        amount: dto.amount,
        bonusType: dto.bonusType,
      },
    });

    const companyId = await this.getCompanyIdByBonusId(bonusId);
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.invalidateTags([
      `bonus:${bonusId}`,
      'bonuses:active',
      `employee:${updated.employeeId}:bonuses`,
    ]);

    return updated;
  }

  // -------------------------------------------------------
  // delete (soft)
  // -------------------------------------------------------
  async remove(user: User, bonusId: string) {
    const existing = await this.findOne(bonusId); // cached; also validates
    const [current] = existing as Array<{
      employeeId: string;
      companyId: string;
    }>;

    const result = await this.db
      .update(payrollBonuses)
      .set({
        status: 'inactive',
      })
      .where(
        and(
          eq(payrollBonuses.companyId, user.companyId),
          eq(payrollBonuses.id, bonusId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      userId: user.id,
      action: 'delete',
      entity: 'payroll_bonuses',
      details: 'Deleted a bonus',
      entityId: bonusId,
      changes: { status: 'inactive' },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.invalidateTags([
      `bonus:${bonusId}`,
      'bonuses:active',
      `employee:${current?.employeeId ?? result[0]?.employeeId}:bonuses`,
    ]);

    return result;
  }
}
