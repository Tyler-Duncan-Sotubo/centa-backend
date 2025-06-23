import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';
import { payrollBonuses } from '../schema/payroll-bonuses.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { employees } from 'src/drizzle/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class BonusesService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private auditService: AuditService,
  ) {}

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

    //  Audit log
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

    return result;
  }

  async findAll(companyId: string) {
    const result = await this.db
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

    return result;
  }

  async findOne(bonusId: string) {
    const result = await this.db
      .select({})
      .from(payrollBonuses)
      .where(eq(payrollBonuses.id, bonusId))
      .execute();

    if (result.length === 0) {
      throw new NotFoundException('Bonus not found');
    }

    return result;
  }

  async findAllEmployeeBonuses(companyId: string, employee_id: string) {
    const result = await this.db
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

    return result;
  }

  async update(bonusId: string, dto: UpdateBonusDto, user: User) {
    await this.findOne(bonusId);
    const [updated] = await this.db
      .update(payrollBonuses)
      .set({
        amount: dto.amount,
        bonusType: dto.bonusType,
      })
      .where(eq(payrollBonuses.id, bonusId))
      .returning()
      .execute();

    //  Audit log
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

    return updated;
  }

  async remove(user: User, bonusId: string) {
    await this.findOne(bonusId);
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

    //  Audit log
    await this.auditService.logAction({
      userId: user.id,
      action: 'delete',
      entity: 'payroll_bonuses',
      details: 'Deleted a bonus',
      entityId: bonusId,
      changes: {
        status: 'inactive',
      },
    });

    return result;
  }
}
