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

@Injectable()
export class CompanyTaxService {
  protected table = companyTaxDetails;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async create(dto: CreateCompanyTaxDto, user: User) {
    const { tin, vatNumber, nhfCode, pensionCode } = dto;

    // Check if the company already has tax details
    const existingTaxDetails = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.companyId, user.companyId))
      .execute();

    if (existingTaxDetails.length > 0) {
      throw new BadRequestException('Company already has tax details');
    }

    // Insert new tax details
    const result = await this.db
      .insert(this.table)
      .values({
        companyId: user.companyId,
        tin,
        vatNumber,
        nhfCode,
        pensionCode,
      })
      .returning()
      .execute();

    // Log the creation in the audit table
    await this.audit.logAction({
      action: 'create',
      entity: 'companyTax',
      entityId: result[0].id,
      userId: user.id,
      changes: {
        tin,
        vatNumber,
        nhfCode,
        pensionCode,
      },
    });
  }

  async findOne(companyId: string) {
    const [taxDetails] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.companyId, companyId))
      .execute();

    if (!taxDetails) {
      throw new NotFoundException('Company tax details not found');
    }

    return taxDetails;
  }

  async update(updateCompanyTaxDto: UpdateCompanyTaxDto, user: User) {
    const taxDetails = await this.findOne(user.companyId);

    const { tin, vatNumber, nhfCode, pensionCode } = updateCompanyTaxDto;

    const result = await this.db
      .update(this.table)
      .set({
        tin,
        vatNumber,
        nhfCode,
        pensionCode,
      })
      .where(eq(this.table.companyId, user.companyId))
      .returning()
      .execute();

    if (result.length > 0) {
      const taxDetails = result[0];

      const isComplete =
        taxDetails.tin &&
        taxDetails.vatNumber &&
        taxDetails.pensionCode &&
        taxDetails.nhfCode;

      if (isComplete) {
        await this.companySettings.setSetting(
          user.companyId,
          'onboarding_tax_details',
          true,
        );
      }
    }

    // Log the update in the audit table
    await this.audit.logAction({
      action: 'update',
      entity: 'companyTax',
      entityId: taxDetails.id,
      userId: user.id,
      changes: {
        before: {
          tin: result[0].tin,
          vatNumber: result[0].vatNumber,
          nhfCode: result[0].nhfCode,
          pensionCode: result[0].pensionCode,
        },
        after: { tin, vatNumber, nhfCode, pensionCode },
      },
    });

    return result[0];
  }
}
