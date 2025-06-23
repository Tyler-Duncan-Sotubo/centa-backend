import { Injectable, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { payGroupAllowances } from '../schema/pay-group-allowances.schema';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';
import { eq } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';

@Injectable()
export class AllowancesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  /** Create a new allowance for a pay group */
  async create(dto: CreateAllowanceDto, user: User) {
    // basic validation: if percentage type, percentage must be set, etc.
    if (dto.valueType === 'percentage' && dto.percentage == null) {
      throw new BadRequestException(
        'percentage is required for percentage-type allowance',
      );
    }
    if (dto.valueType === 'fixed' && dto.fixedAmount == null) {
      throw new BadRequestException(
        'fixedAmount is required for fixed-type allowance',
      );
    }

    const [inserted] = await this.db
      .insert(payGroupAllowances)
      .values({
        payGroupId: dto.payGroupId,
        allowanceType: dto.allowanceType,
        valueType: dto.valueType,
        percentage: dto.percentage ?? '0.00',
        fixedAmount: dto.fixedAmount != null ? dto.fixedAmount * 100 : 0,
      })
      .returning()
      .execute();

    // Log the creation of the allowance
    await this.auditService.logAction({
      action: 'create',
      entity: 'pay_group_allowance',
      entityId: inserted.id,
      userId: user.id, // Assuming userId is part of the DTO
      details: `Created allowance ${inserted.allowanceType} for pay group ${dto.payGroupId}`,
      changes: {
        payGroupId: dto.payGroupId,
        allowanceType: dto.allowanceType,
        valueType: dto.valueType,
        percentage: dto.percentage ?? '0.00',
        fixedAmount: dto.fixedAmount ?? 0,
      },
    });

    return inserted;
  }

  /** List all allowances, optionally scoped to one pay-group */
  async findAll(payGroupId?: string) {
    const qb = this.db.select().from(payGroupAllowances);
    if (payGroupId) {
      qb.where(eq(payGroupAllowances.payGroupId, payGroupId));
    }
    return await qb.execute();
  }

  /** Get a single allowance by its ID */
  async findOne(id: string) {
    const [allowance] = await this.db
      .select()
      .from(payGroupAllowances)
      .where(eq(payGroupAllowances.id, id))
      .execute();
    if (!allowance) {
      throw new BadRequestException(`Allowance ${id} not found`);
    }
    return allowance;
  }

  /** Update an existing allowance */
  async update(id: string, dto: UpdateAllowanceDto, user: User) {
    await this.findOne(id); // ensure exists

    // If switching types, ensure corresponding field is present
    if (dto.valueType === 'percentage' && dto.percentage == null) {
      throw new BadRequestException(
        'percentage is required for percentage-type allowance',
      );
    }
    if (dto.valueType === 'fixed' && dto.fixedAmount == null) {
      throw new BadRequestException(
        'fixedAmount is required for fixed-type allowance',
      );
    }

    await this.db
      .update(payGroupAllowances)
      .set({ ...dto })
      .where(eq(payGroupAllowances.id, id))
      .execute();

    // Log the update of the allowance
    await this.auditService.logAction({
      action: 'update',
      entity: 'pay_group_allowance',
      entityId: id,
      userId: user.id, // Assuming userId is part of the DTO
      details: `Updated allowance ${id}`,
      changes: {
        ...dto,
      },
    });

    return { message: 'Allowance updated successfully' };
  }

  /** Remove an allowance */
  async remove(id: string, user: User) {
    await this.findOne(id); // ensure exists first
    await this.db
      .delete(payGroupAllowances)
      .where(eq(payGroupAllowances.id, id))
      .execute();

    // Log the deletion of the allowance
    await this.auditService.logAction({
      action: 'delete',
      entity: 'pay_group_allowance',
      entityId: id,
      userId: user.id, // Assuming userId is part of the DTO
      details: `Deleted allowance ${id}`,
      changes: {
        id,
      },
    });

    return { message: 'Allowance deleted successfully' };
  }
}
