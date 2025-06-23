import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { costCenters } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { User } from 'src/common/types/user.type';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class CostCentersService extends BaseCrudService<
  { code: string; name: string; budget: number },
  typeof costCenters
> {
  protected table = costCenters;

  constructor(
    @Inject(DRIZZLE) db: db,
    audit: AuditService,
    private readonly companySettings: CompanySettingsService,
  ) {
    super(db, audit);
  }

  async create(companyId: string, dto: CreateCostCenterDto) {
    const { code, name, budget } = dto;
    const costCenter = await this.db
      .insert(costCenters)
      .values({ code, name, budget, companyId })
      .returning({ id: costCenters.id })
      .execute();

    // make onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_cost_center',
      true,
    );

    return costCenter[0];
  }

  async bulkCreate(companyId: string, rows: any[]) {
    // 1) Map and validate to DTOs
    const dtos: CreateCostCenterDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateCostCenterDto, {
        code: row['Code'] || row['code'],
        name: row['Name'] || row['name'],
        budget: Number(row['Budget'] || row['budget'] || 0),
      });
      const errs = await validate(dto);
      if (errs.length) {
        throw new BadRequestException(
          'Invalid CSV format or data: ' + JSON.stringify(errs),
        );
      }
      dtos.push(dto);
    }

    // 2) Check for duplicates
    const codes = dtos.map((d) => d.code);
    const duplicates = await this.db
      .select({ code: costCenters.code })
      .from(costCenters)
      .where(
        and(
          eq(costCenters.companyId, companyId),
          inArray(costCenters.code, codes),
        ),
      )
      .execute();

    if (duplicates.length) {
      const duplicateCodes = duplicates.map((d) => d.code);
      throw new BadRequestException(
        `Cost center codes already exist: ${duplicateCodes.join(', ')}`,
      );
    }

    // 2) Insert in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      // prepare values
      const values = dtos.map((d) => ({
        companyId,
        code: d.code,
        name: d.name,
        budget: d.budget,
      }));
      const result = await trx
        .insert(costCenters)
        .values(values)
        .returning({
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
          budget: costCenters.budget,
        })
        .execute();

      return result;
    });

    // make onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_cost_center',
      true,
    );

    return inserted;
  }

  async findAll(companyId: string) {
    return this.db
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        budget: costCenters.budget,
      })
      .from(costCenters)
      .where(eq(costCenters.companyId, companyId))
      .execute();
  }

  async findOne(companyId: string, id: string) {
    const [cc] = await this.db
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        budget: costCenters.budget,
      })
      .from(costCenters)
      .where(and(eq(costCenters.companyId, companyId), eq(costCenters.id, id)))
      .execute();
    if (!cc) throw new NotFoundException(`Cost center ${id} not found`);
    return cc;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCostCenterDto,
    userId: string,
    ip: string,
  ) {
    return this.updateWithAudit(
      companyId,
      id,
      { code: dto.code, name: dto.name, budget: dto.budget },
      {
        entity: 'CostCenter',
        action: 'UpdateCostCenter',
        fields: ['code', 'name', 'budget'],
      },
      userId,
      ip,
    );
  }

  async remove(user: User, id: string) {
    const [deleted] = await this.db
      .delete(costCenters)
      .where(
        and(eq(costCenters.companyId, user.companyId), eq(costCenters.id, id)),
      )
      .returning({ id: costCenters.id })
      .execute();

    if (!deleted) {
      throw new NotFoundException(`Cost Centers ${id} not found`);
    }

    // Audit the deletion
    await this.audit.logAction({
      entity: 'delete',
      action: 'Delete Cost Center',
      details: 'Cost center deleted',
      userId: user.id,
      changes: {
        before: deleted,
        after: null,
      },
    });

    return { id: deleted.id };
  }
}
