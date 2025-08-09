import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyTaxDto } from './dto/create-company-tax.dto';
import { UpdateCompanyTaxDto } from './dto/update-company-tax.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq } from 'drizzle-orm';
import { companyTaxDetails } from '../schema/company-tax-details.schema';
import { User } from 'src/common/types/user.type';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CompanyTaxService {
  protected table = companyTaxDetails;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly companySettings: CompanySettingsService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(CompanyTaxService.name);
  }

  // -------- cache keys --------
  private oneKey(companyId: string) {
    return `company:tax:${companyId}`;
  }

  private async burst(companyId: string) {
    await this.cache.del(this.oneKey(companyId));
    this.logger.debug({ companyId }, 'companyTax:cache:burst');
  }

  async create(dto: CreateCompanyTaxDto, user: User) {
    this.logger.info({ companyId: user.companyId }, 'companyTax:create:start');

    // Check if the company already has tax details
    const existing = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.companyId, user.companyId))
      .execute();

    if (existing.length > 0) {
      this.logger.warn(
        { companyId: user.companyId },
        'companyTax:create:exists',
      );
      throw new BadRequestException('Company already has tax details');
    }

    const [created] = await this.db
      .insert(this.table)
      .values({
        companyId: user.companyId,
        tin: dto.tin,
        vatNumber: dto.vatNumber,
        nhfCode: dto.nhfCode,
        pensionCode: dto.pensionCode,
      })
      .returning()
      .execute();

    await this.audit.logAction({
      action: 'create',
      entity: 'companyTax',
      entityId: created.id,
      userId: user.id,
      changes: {
        tin: dto.tin,
        vatNumber: dto.vatNumber,
        nhfCode: dto.nhfCode,
        pensionCode: dto.pensionCode,
      },
    });

    await this.burst(user.companyId);
    this.logger.info({ id: created.id }, 'companyTax:create:done');
    return created;
  }

  async findOne(companyId: string) {
    const key = this.oneKey(companyId);
    this.logger.debug({ companyId, key }, 'companyTax:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [taxDetails] = await this.db
        .select()
        .from(this.table)
        .where(eq(this.table.companyId, companyId))
        .execute();

      if (!taxDetails) {
        this.logger.warn({ companyId }, 'companyTax:findOne:not-found');
        throw new NotFoundException('Company tax details not found');
      }

      this.logger.debug({ companyId }, 'companyTax:findOne:db:done');
      return taxDetails;
    });
  }

  async update(updateCompanyTaxDto: UpdateCompanyTaxDto, user: User) {
    this.logger.info(
      { companyId: user.companyId, userId: user.id },
      'companyTax:update:start',
    );

    // previous (also validates existence)
    const previous = await this.findOne(user.companyId);

    const [updated] = await this.db
      .update(this.table)
      .set({
        tin: updateCompanyTaxDto.tin,
        vatNumber: updateCompanyTaxDto.vatNumber,
        nhfCode: updateCompanyTaxDto.nhfCode,
        pensionCode: updateCompanyTaxDto.pensionCode,
      })
      .where(eq(this.table.companyId, user.companyId))
      .returning()
      .execute();

    // mark onboarding step complete if fully filled
    if (updated) {
      const isComplete =
        Boolean(updated.tin) &&
        Boolean(updated.vatNumber) &&
        Boolean(updated.pensionCode) &&
        Boolean(updated.nhfCode);

      if (isComplete) {
        await this.companySettings.setSetting(
          user.companyId,
          'onboarding_tax_details',
          true,
        );
      }
    }

    await this.audit.logAction({
      action: 'update',
      entity: 'companyTax',
      entityId: previous.id,
      userId: user.id,
      changes: {
        before: {
          tin: previous.tin,
          vatNumber: previous.vatNumber,
          nhfCode: previous.nhfCode,
          pensionCode: previous.pensionCode,
        },
        after: {
          tin: updated.tin,
          vatNumber: updated.vatNumber,
          nhfCode: updated.nhfCode,
          pensionCode: updated.pensionCode,
        },
      },
    });

    await this.burst(user.companyId);
    this.logger.info({ id: updated.id }, 'companyTax:update:done');
    return updated;
  }
}
