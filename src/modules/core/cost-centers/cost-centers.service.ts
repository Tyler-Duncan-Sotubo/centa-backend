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
import { PinoLogger } from 'nestjs-pino';

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
    private readonly logger: PinoLogger,
  ) {
    super(db, audit);
    this.logger.setContext(CostCentersService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `cc:${companyId}:list`;
  }
  private oneKey(companyId: string, id: string) {
    return `cc:${companyId}:one:${id}`;
  }
  private async burst(companyId: string, id?: string) {
    const jobs: Promise<any>[] = [this.cache.del(this.listKey(companyId))];
    if (id) jobs.push(this.cache.del(this.oneKey(companyId, id)));
    await Promise.allSettled(jobs);
    this.logger.debug({ companyId, id }, 'cost-centers:cache:burst');
  }

  // ---------- mutations ----------
  async create(companyId: string, dto: CreateCostCenterDto) {
    this.logger.info({ companyId, dto }, 'cost-centers:create:start');

    const { code, name, budget } = dto;
    const [created] = await this.db
      .insert(costCenters)
      .values({ code, name, budget, companyId })
      .returning({ id: costCenters.id })
      .execute();

    await this.companySettings.setSetting(
      companyId,
      'onboarding_cost_center',
      true,
    );

    await this.burst(companyId, created.id);
    this.logger.info({ id: created.id }, 'cost-centers:create:done');
    return created;
  }

  async bulkCreate(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rows: rows?.length },
      'cost-centers:bulkCreate:start',
    );

    // 1) Map + validate
    const dtos: CreateCostCenterDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateCostCenterDto, {
        code: row['Code'] || row['code'],
        name: row['Name'] || row['name'],
        budget: Number(row['Budget'] || row['budget'] || 0),
      });
      const errs = await validate(dto);
      if (errs.length) {
        this.logger.warn({ errs }, 'cost-centers:bulkCreate:validation-error');
        throw new BadRequestException(
          'Invalid CSV format or data: ' + JSON.stringify(errs),
        );
      }
      dtos.push(dto);
    }

    // 2) Check duplicates
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
      this.logger.warn(
        { duplicateCodes },
        'cost-centers:bulkCreate:duplicates',
      );
      throw new BadRequestException(
        `Cost center codes already exist: ${duplicateCodes.join(', ')}`,
      );
    }

    // 3) Insert
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

    await this.companySettings.setSetting(
      companyId,
      'onboarding_cost_center',
      true,
    );

    await this.burst(companyId); // list-level
    this.logger.info(
      { count: inserted.length },
      'cost-centers:bulkCreate:done',
    );
    return inserted;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCostCenterDto,
    userId: string,
    ip: string,
  ) {
    this.logger.info({ companyId, id, userId }, 'cost-centers:update:start');

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

    await this.burst(companyId, id);
    this.logger.info({ id }, 'cost-centers:update:done');
    return result;
  }

  async remove(user: User, id: string) {
    this.logger.info(
      { companyId: user.companyId, id, userId: user.id },
      'cost-centers:remove:start',
    );

    const [deleted] = await this.db
      .delete(costCenters)
      .where(
        and(eq(costCenters.companyId, user.companyId), eq(costCenters.id, id)),
      )
      .returning({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        budget: costCenters.budget,
      })
      .execute();

    if (!deleted) {
      this.logger.warn({ id }, 'cost-centers:remove:not-found');
      throw new NotFoundException(`Cost Centers ${id} not found`);
    }

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

    await this.burst(user.companyId, id);
    this.logger.info({ id }, 'cost-centers:remove:done');
    return { id: deleted.id };
  }

  // ---------- queries ----------
  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'cost-centers:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
          budget: costCenters.budget,
        })
        .from(costCenters)
        .where(eq(costCenters.companyId, companyId))
        .execute();

      this.logger.debug(
        { companyId, count: rows.length },
        'cost-centers:findAll:db:done',
      );
      return rows;
    });
  }

  async findOne(companyId: string, id: string) {
    const key = this.oneKey(companyId, id);
    this.logger.debug({ companyId, id, key }, 'cost-centers:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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

      if (!cc) {
        this.logger.warn({ companyId, id }, 'cost-centers:findOne:not-found');
        throw new NotFoundException(`Cost center ${id} not found`);
      }

      this.logger.debug({ id }, 'cost-centers:findOne:db:done');
      return cc;
    });
  }
}
