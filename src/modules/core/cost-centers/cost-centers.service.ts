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
import { CacheService } from 'src/common/cache/cache.service';

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
    private readonly cache: CacheService,
  ) {
    super(db, audit);
  }

  private ttlSeconds = 60 * 60; // 1h
  private tags(companyId: string) {
    return [`company:${companyId}:cost-centers`];
  }

  async create(companyId: string, dto: CreateCostCenterDto) {
    const { code, name, budget } = dto;
    const [created] = await this.db
      .insert(costCenters)
      .values({ code, name, budget, companyId })
      .returning({ id: costCenters.id })
      .execute();

    // onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_cost_center',
      true,
    );

    // invalidate versioned caches
    await this.cache.bumpCompanyVersion(companyId);

    return created;
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

    // 2) Check for duplicates (by code)
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

    // 3) Insert in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        code: d.code,
        name: d.name,
        budget: d.budget,
      }));
      return trx
        .insert(costCenters)
        .values(values)
        .returning({
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
          budget: costCenters.budget,
        })
        .execute();
    });

    // onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_cost_center',
      true,
    );

    // invalidate versioned caches
    await this.cache.bumpCompanyVersion(companyId);

    return inserted;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['cost-centers', 'all'],
      () =>
        this.db
          .select({
            id: costCenters.id,
            code: costCenters.code,
            name: costCenters.name,
            budget: costCenters.budget,
          })
          .from(costCenters)
          .where(eq(costCenters.companyId, companyId))
          .execute(),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async findOne(companyId: string, id: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['cost-centers', 'one', id],
      async () => {
        const [cc] = await this.db
          .select({
            id: costCenters.id,
            code: costCenters.code,
            name: costCenters.name,
            budget: costCenters.budget,
          })
          .from(costCenters)
          .where(
            and(eq(costCenters.companyId, companyId), eq(costCenters.id, id)),
          )
          .execute();
        if (!cc) throw new NotFoundException(`Cost center ${id} not found`);
        return cc;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCostCenterDto,
    userId: string,
    ip: string,
  ) {
    const result = await this.updateWithAudit(
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

    // bump caches for company
    await this.cache.bumpCompanyVersion(companyId);

    return result;
  }

  async remove(user: User, id: string) {
    const [deleted] = await this.db
      .delete(costCenters)
      .where(
        and(eq(costCenters.companyId, user.companyId), eq(costCenters.id, id)),
      )
      .returning({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
      })
      .execute();

    if (!deleted) {
      throw new NotFoundException(`Cost Centers ${id} not found`);
    }

    // Audit the deletion
    await this.audit.logAction({
      entity: 'CostCenter',
      action: 'Delete',
      details: 'Cost center deleted',
      userId: user.id,
      changes: {
        before: deleted,
        after: null,
      },
    });

    // bump caches for company
    await this.cache.bumpCompanyVersion(user.companyId);

    return { id: deleted.id };
  }
}
