import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { payGroupAllowances } from '../schema/pay-group-allowances.schema';
import { payGroups } from 'src/modules/payroll/schema/pay-groups.schema';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';

@Injectable()
export class AllowancesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  // ------------------------
  // helpers
  // ------------------------
  private cents(n?: number | null) {
    return n != null ? Math.round(n * 100) : 0;
  }

  private async getCompanyIdByPayGroupId(payGroupId: string): Promise<string> {
    const [pg] = await this.db
      .select({ companyId: payGroups.companyId })
      .from(payGroups)
      .where(eq(payGroups.id, payGroupId))
      .limit(1)
      .execute();

    if (!pg?.companyId) throw new NotFoundException('Pay group not found');
    return pg.companyId;
  }

  private async getCompanyIdByAllowanceId(
    allowanceId: string,
  ): Promise<string> {
    const [row] = await this.db
      .select({ payGroupId: payGroupAllowances.payGroupId })
      .from(payGroupAllowances)
      .where(eq(payGroupAllowances.id, allowanceId))
      .limit(1)
      .execute();

    if (!row?.payGroupId) throw new NotFoundException('Allowance not found');
    return this.getCompanyIdByPayGroupId(row.payGroupId);
  }

  // ------------------------
  // create
  // ------------------------
  /** Create a new allowance for a pay group */
  async create(dto: CreateAllowanceDto, user: User) {
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
        fixedAmount: this.cents(dto.fixedAmount),
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'pay_group_allowance',
      entityId: inserted.id,
      userId: user.id,
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

  // ------------------------
  // read
  // ------------------------
  /** List all allowances for a pay-group (recommended); if payGroupId omitted, returns all (no cache). */
  async findAll(payGroupId?: string) {
    if (!payGroupId) {
      // No clear company scope → return fresh result (avoid wrong version key)
      return await this.db.select().from(payGroupAllowances).execute();
    }

    return await this.db
      .select()
      .from(payGroupAllowances)
      .where(eq(payGroupAllowances.payGroupId, payGroupId))
      .execute();
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

  // ------------------------
  // update
  // ------------------------
  /** Update an existing allowance */
  async update(id: string, dto: UpdateAllowanceDto, user: User) {
    // Ensure exists (and resolve company via helper later)
    await this.findOne(id);

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

    const payload: Partial<UpdateAllowanceDto & { fixedAmount: number }> = {
      ...dto,
    };
    if (dto.fixedAmount != null) {
      payload.fixedAmount = this.cents(dto.fixedAmount);
    }

    await this.db
      .update(payGroupAllowances)
      .set(payload as any)
      .where(eq(payGroupAllowances.id, id))
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'pay_group_allowance',
      entityId: id,
      userId: user.id,
      details: `Updated allowance ${id}`,
      changes: { ...dto },
    });

    // find payGroupId to tag-invalidate list
    await this.db
      .select({ payGroupId: payGroupAllowances.payGroupId })
      .from(payGroupAllowances)
      .where(eq(payGroupAllowances.id, id))
      .limit(1)
      .execute();

    return { message: 'Allowance updated successfully' };
  }

  // ------------------------
  // delete
  // ------------------------
  /** Remove an allowance */
  async remove(id: string, user: User) {
    // ensure exists & get payGroupId for invalidation
    const [existing] = await this.db
      .select({ payGroupId: payGroupAllowances.payGroupId })
      .from(payGroupAllowances)
      .where(eq(payGroupAllowances.id, id))
      .limit(1)
      .execute();

    if (!existing?.payGroupId)
      throw new BadRequestException(`Allowance ${id} not found`);

    await this.db
      .delete(payGroupAllowances)
      .where(eq(payGroupAllowances.id, id))
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'pay_group_allowance',
      entityId: id,
      userId: user.id,
      details: `Deleted allowance ${id}`,
      changes: { id },
    });

    return { message: 'Allowance deleted successfully' };
  }
}
